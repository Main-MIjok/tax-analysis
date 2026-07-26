const { Pool } = require("pg");

const pool = new Pool({
    user: "postgres",
    password: "2357",
    host: "localhost",
    port: 5432,
    database: "tax_db",
});

pool.connect((err, client, release) => {
    if (err) {
        return console.error("Ошибка подключения к базе данных:", err.stack);
    }
    console.log("Успешное подключение к PostgreSQL!");
    release();
});

module.exports = pool;
