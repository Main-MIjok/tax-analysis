const express = require("express");
const cors = require("cors");
const pool = require("./db/database");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

app.get("/api/test", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");
        res.json({ message: "Бэкенд работает!", time: result.rows[0].now });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Внутренняя ошибка сервера" });
    }
});

app.post("/api/pay", async (req, res) => {
    const { taxpayerId } = req.body;

    try {
        const result = await pool.query(
            `UPDATE payments 
             SET status = 'Оплачено', payment_date = CURRENT_DATE 
             WHERE taxpayer_id = $1 AND status = 'Не оплачено'`,
            [taxpayerId],
        );

        res.json({ success: true, message: "Налоги успешно оплачены" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при проведении платежа" });
    }
});

app.get("/api/inspector/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const inspectorQuery = await pool.query(`SELECT full_name, position, dept_code FROM inspectors WHERE id = $1`, [
            id,
        ]);

        if (inspectorQuery.rows.length === 0) {
            return res.status(404).json({ error: "Сотрудник не найден" });
        }

        const taxpayersQuery = await pool.query(
            `SELECT 
                t.id, 
                t.inn, 
                t.full_name, 
                COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'Не оплачено'), 0) as total_debt
             FROM taxpayers t
             LEFT JOIN payments p ON t.id = p.taxpayer_id
             GROUP BY t.id, t.inn, t.full_name
             ORDER BY total_debt DESC`,
        );

        const collectedQuery = await pool.query("SELECT total_sum FROM v_collected_taxes");
        const totalCollected = collectedQuery.rows[0].total_sum;

        res.json({
            profile: inspectorQuery.rows[0],
            taxpayers: taxpayersQuery.rows,
            totalCollected: totalCollected,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при загрузке данных инспектора" });
    }
});

app.get("/api/taxpayer/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const userQuery = await pool.query(`SELECT full_name, inn FROM taxpayers WHERE id = $1`, [id]);

        if (userQuery.rows.length === 0) {
            return res.status(404).json({ error: "Пользователь не найден" });
        }

        const propertyQuery = await pool.query(
            `SELECT p.name as property_name, t.name as tax_type 
             FROM properties p 
             JOIN tax_types t ON p.tax_type_id = t.id 
             WHERE p.taxpayer_id = $1`,
            [id],
        );

        const paymentsQuery = await pool.query(
            `SELECT p.amount, p.status, p.payment_date, t.name as tax_type, pr.name as property_name 
             FROM payments p 
             JOIN tax_types t ON p.tax_type_id = t.id 
             LEFT JOIN properties pr ON p.property_id = pr.id 
             WHERE p.taxpayer_id = $1`,
            [id],
        );

        const unpaidSum = paymentsQuery.rows
            .filter(pay => pay.status === "Не оплачено")
            .reduce((sum, pay) => sum + parseFloat(pay.amount), 0);

        res.json({
            profile: userQuery.rows[0],
            properties: propertyQuery.rows,
            payments: paymentsQuery.rows,
            totalDebt: unpaidSum,
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при получении данных" });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер налоговой системы запущен на http://localhost:${PORT}`);
});

app.post("/api/login", async (req, res) => {
    const { login, password, role } = req.body;

    try {
        const result = await pool.query(
            `SELECT u.id, u.login, r.name as role_name 
             FROM users u 
             JOIN roles r ON u.role_id = r.id 
             WHERE u.login = $1 AND u.password = $2`,
            [login, password],
        );

        if (result.rows.length > 0) {
            const user = result.rows[0];

            if (user.role_name === role) {
                let profileId = null;
                if (role === "taxpayer") {
                    const tp = await pool.query("SELECT id FROM taxpayers WHERE user_id = $1", [user.id]);
                    if (tp.rows.length > 0) profileId = tp.rows[0].id;
                } else {
                    const insp = await pool.query("SELECT id FROM inspectors WHERE user_id = $1", [user.id]);
                    if (insp.rows.length > 0) profileId = insp.rows[0].id;
                }

                const redirectUrl = role === "taxpayer" ? "taxpayer.html" : "inspector.html";

                console.log("Логин:", login, "роль:", role, "=> profileId:", profileId);

                res.json({ success: true, redirect: redirectUrl, profileId: profileId });
            }
        } else {
            res.status(401).json({ success: false, message: "Неверный логин или пароль" });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера БД" });
    }
});

app.post("/api/add-tax", async (req, res) => {
    const { taxpayerId, amount } = req.body;

    try {
        await pool.query(
            `INSERT INTO payments (taxpayer_id, tax_type_id, amount, status) 
             VALUES ($1, 3, $2, 'Не оплачено')`,
            [taxpayerId, amount],
            // 2. Убрали дубль const propertyContainer (оставили строго один раз)
        );

        res.json({ success: true, message: "Штраф успешно начислен" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при начислении штрафа" });
    }
});

app.delete("/api/delete-tax", async (req, res) => {
    const { taxpayerId } = req.body;

    try {
        await pool.query(`DELETE FROM payments WHERE taxpayer_id = $1 AND status = 'Не оплачено'`, [taxpayerId]);

        res.json({ success: true, message: "Задолженность успешно аннулирована" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при удалении начисления" });
    }
});
