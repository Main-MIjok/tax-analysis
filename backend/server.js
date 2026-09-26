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

app.post('/api/login', async (req, res) => {
    const { login, password } = req.body;
    try {
        const userQuery = await pool.query(
            `SELECT u.id, u.role_id, r.role_name
             FROM users u
             JOIN roles r ON u.role_id = r.id
             WHERE u.login = $1 AND u.password = $2`,
            [login, password]
        );

        if (userQuery.rows.length === 0) {
            return res.status(401).json({ error: 'Неверные учетные данные' });
        }

        const user = userQuery.rows[0];
        let profileId = null;

        if (user.role_name === 'taxpayer') {
            const tp = await pool.query(`SELECT id FROM taxpayers WHERE user_id = $1`, [user.id]);
            profileId = tp.rows[0]?.id;
        } else if (user.role_name === 'inspector') {
            const insp = await pool.query(`SELECT id FROM inspectors WHERE user_id = $1`, [user.id]);
            profileId = insp.rows[0]?.id;
        }

        res.json({ success: true, role: user.role_name, profileId });
    } catch (err) {
        console.error("Ошибка при логине:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.get("/api/inspector/:id", async (req, res) => {
    const { id } = req.params;

    try {
        const inspectorQuery = await pool.query(`SELECT full_name, position, dept_code FROM inspectors WHERE id = $1`, [id]);

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
             ORDER BY total_debt DESC`
        );

        const collectedQuery = await pool.query("SELECT total_sum FROM v_collected_taxes");
        const totalCollected = collectedQuery.rows[0]?.total_sum || 0;

        const paymentsHistoryQuery = await pool.query(
            `SELECT pay.amount, pay.payment_date, t.full_name, tt.tax_name
             FROM payments pay
             JOIN taxpayers t ON pay.taxpayer_id = t.id
             JOIN tax_types tt ON pay.tax_type_id = tt.id
             WHERE pay.status = 'Оплачено'
             ORDER BY pay.payment_date DESC
             LIMIT 20`
        );

        res.json({
            profile: inspectorQuery.rows[0],
            taxpayers: taxpayersQuery.rows,
            totalCollected: totalCollected,
            payments: paymentsHistoryQuery.rows
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при загрузке данных инспектора" });
    }
});

app.post('/api/add-taxpayer', async (req, res) => {
    const { inn, fullName, passport, password } = req.body;

    try {
        const userResult = await pool.query(
            `INSERT INTO users (login, password, role_id)
             VALUES ($1, $2, 1) RETURNING id`,
            [inn, password]
        );

        const newUserId = userResult.rows[0].id;

        await pool.query(
            `INSERT INTO taxpayers (user_id, inn, full_name, passport_data, region_id)
             VALUES ($1, $2, $3, $4, 1)`,
            [newUserId, inn, fullName, passport]
        );

        res.json({ success: true, message: 'Налогоплательщик успешно добавлен в базу!' });
    } catch (err) {
        console.error("Ошибка при добавлении налогоплательщика:", err);
        if (err.code === '23505') {
            res.status(400).json({ error: 'Пользователь с таким ИНН уже существует' });
        } else {
            res.status(500).json({ error: 'Ошибка сервера при добавлении в БД' });
        }
    }
});

app.post("/api/add-tax", async (req, res) => {
    const { taxpayerId, amount } = req.body;
    try {
        await pool.query(
            `INSERT INTO payments (taxpayer_id, tax_type_id, amount, status)
             VALUES ($1, 3, $2, 'Не оплачено')`,
            [taxpayerId, amount]
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

app.get('/api/taxpayer/:id', async (req, res) => {
    const { id } = req.params;

    try {
        const profileQuery = await pool.query(
            `SELECT full_name, inn FROM taxpayers WHERE id = $1`,
            [id]
        );

        const propertiesQuery = await pool.query(
            `SELECT p.id, p.property_name, t.tax_name as tax_type
             FROM properties p
             JOIN tax_types t ON p.tax_type_id = t.id
             WHERE p.taxpayer_id = $1`,
            [id]
        );

        const paymentsQuery = await pool.query(
            `SELECT pay.amount, pay.status, pay.payment_date,
                    t.tax_name as tax_type,
                    prop.property_name
             FROM payments pay
             JOIN tax_types t ON pay.tax_type_id = t.id
             LEFT JOIN properties prop ON pay.property_id = prop.id
             WHERE pay.taxpayer_id = $1
             ORDER BY pay.status DESC, pay.payment_date DESC`,
            [id]
        );

        const totalDebt = paymentsQuery.rows
            .filter(p => p.status === 'Не оплачено')
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);

        res.json({
            profile: profileQuery.rows[0],
            properties: propertiesQuery.rows,
            payments: paymentsQuery.rows,
            totalDebt: totalDebt
        });

    } catch (err) {
        console.error("Ошибка при загрузке налогоплательщика:", err);
        res.status(500).json({ error: 'Ошибка сервера' });
    }
});

app.post("/api/pay", async (req, res) => {
    const { taxpayerId } = req.body;
    try {
        await pool.query(
            `UPDATE payments
             SET status = 'Оплачено', payment_date = CURRENT_DATE
             WHERE taxpayer_id = $1 AND status = 'Не оплачено'`,
            [taxpayerId]
        );
        res.json({ success: true, message: "Налоги успешно оплачены" });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: "Ошибка сервера при проведении платежа" });
    }
});

app.post('/api/add-property', async (req, res) => {
    const { taxpayerId, propertyName, taxTypeId } = req.body;
    try {
        await pool.query(
            `INSERT INTO properties (taxpayer_id, property_name, tax_type_id)
             VALUES ($1, $2, $3)`,
            [taxpayerId, propertyName, taxTypeId]
        );
        res.json({ success: true, message: 'Имущество успешно зарегистрировано!' });
    } catch (err) {
        console.error("Ошибка при добавлении имущества:", err);
        res.status(500).json({ error: 'Ошибка сервера при добавлении имущества' });
    }
});

app.delete('/api/delete-property/:id', async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM properties WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (err) {
        console.error("Ошибка при удалении имущества:", err);
        res.status(500).json({ error: 'Не удалось удалить объект. Возможно, к нему привязаны платежи.' });
    }
});

app.put('/api/inspector/update/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName, position, deptCode } = req.body;

    try {
        await pool.query(
            `UPDATE inspectors
             SET full_name = $1, position = $2, dept_code = $3
             WHERE id = $4`,
            [fullName, position, deptCode, id]
        );
        res.json({ success: true, message: 'Профиль успешно обновлен!' });
    } catch (err) {
        console.error("Ошибка при обновлении профиля инспектора:", err);
        res.status(500).json({ error: 'Ошибка сервера при обновлении данных' });
    }
});

app.get('/api/reports', async (req, res) => {
    try {
        const reportQuery = await pool.query(`
            SELECT
                t.tax_name,
                COUNT(p.id) as payment_count,
                SUM(p.amount) as total_sum
            FROM payments p
            JOIN tax_types t ON p.tax_type_id = t.id
            WHERE p.status = 'Оплачено'
            GROUP BY t.tax_name
            ORDER BY total_sum DESC
        `);
        res.json(reportQuery.rows);
    } catch (err) {
        console.error("Ошибка при генерации отчета:", err);
        res.status(500).json({ error: 'Ошибка сервера при формировании отчета' });
    }
});

app.listen(PORT, () => {
    console.log(`Сервер налоговой системы запущен на http://localhost:${PORT}`);
});

app.put('/api/taxpayer/update/:id', async (req, res) => {
    const { id } = req.params;
    const { fullName } = req.body;
    try {
        await pool.query('UPDATE taxpayers SET full_name = $1 WHERE id = $2', [fullName, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления' });
    }
});

app.delete('/api/taxpayer/delete/:id', async (req, res) => {
    const { id } = req.params;
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        await client.query('DELETE FROM payments WHERE taxpayer_id = $1', [id]);
        await client.query('DELETE FROM properties WHERE taxpayer_id = $1', [id]);
        const tpResult = await client.query('DELETE FROM taxpayers WHERE id = $1 RETURNING user_id', [id]);
        if (tpResult.rows.length > 0) {
            await client.query('DELETE FROM users WHERE id = $1', [tpResult.rows[0].user_id]);
        }
        await client.query('COMMIT');
        res.json({ success: true });
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({ error: 'Ошибка удаления' });
    } finally {
        client.release();
    }
});

app.put('/api/property/update/:id', async (req, res) => {
    const { id } = req.params;
    const { propertyName } = req.body;
    try {
        await pool.query('UPDATE properties SET property_name = $1 WHERE id = $2', [propertyName, id]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Ошибка обновления имущества' });
    }
});
