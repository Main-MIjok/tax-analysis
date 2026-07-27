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
