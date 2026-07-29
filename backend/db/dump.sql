-- ==========================================
-- ПОЛНЫЙ ДАМП БАЗЫ ДАННЫХ ФНС
-- ==========================================

DROP VIEW IF EXISTS v_collected_taxes CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS properties CASCADE;
DROP TABLE IF EXISTS inspectors CASCADE;
DROP TABLE IF EXISTS taxpayers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS tax_types CASCADE;
DROP TABLE IF EXISTS regions CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL
);

CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    region_name VARCHAR(100) NOT NULL,
    region_code VARCHAR(10) NOT NULL
);

CREATE TABLE tax_types (
    id SERIAL PRIMARY KEY,
    tax_name VARCHAR(100) NOT NULL,
    tax_level VARCHAR(50) NOT NULL
);

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(50) UNIQUE NOT NULL,
    password VARCHAR(100) NOT NULL,
    role_id INTEGER REFERENCES roles(id) ON DELETE RESTRICT
);

CREATE TABLE taxpayers (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    inn VARCHAR(12) UNIQUE NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    passport_data VARCHAR(50),
    region_id INTEGER REFERENCES regions(id) ON DELETE SET NULL
);

CREATE TABLE inspectors (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(150) NOT NULL,
    position VARCHAR(100) NOT NULL,
    dept_code VARCHAR(20) NOT NULL
);

CREATE TABLE properties (
    id SERIAL PRIMARY KEY,
    taxpayer_id INTEGER REFERENCES taxpayers(id) ON DELETE CASCADE,
    tax_type_id INTEGER REFERENCES tax_types(id) ON DELETE RESTRICT,
    property_name VARCHAR(150) NOT NULL,
    cadastral_number VARCHAR(50)
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    taxpayer_id INTEGER REFERENCES taxpayers(id) ON DELETE CASCADE,
    tax_type_id INTEGER REFERENCES tax_types(id) ON DELETE RESTRICT,
    property_id INTEGER REFERENCES properties(id) ON DELETE SET NULL,
    amount NUMERIC(10, 2) NOT NULL,
    status VARCHAR(50) DEFAULT 'Не оплачено',
    payment_date DATE DEFAULT CURRENT_DATE
);


CREATE OR REPLACE VIEW v_collected_taxes AS
SELECT 
    COALESCE(SUM(amount), 0) AS total_sum
FROM payments
WHERE status = 'Оплачено';


INSERT INTO roles (role_name) VALUES 
('taxpayer'),
('inspector');

INSERT INTO regions (region_name, region_code) VALUES 
('Томская область', '70'),
('Москва', '77');

INSERT INTO tax_types (id, tax_name, tax_level) VALUES 
(1, 'Транспортный налог', 'Региональный'),
(2, 'Имущественный налог', 'Местный'),
(3, 'НДФЛ / Штраф', 'Федеральный');
-- Сбрасываем счетчик SERIAL для tax_types
SELECT setval('tax_types_id_seq', 3);

-- Добавляем пользователей
-- Логин налогоплательщика: 123456789012 / Пароль: 12345
-- Логин инспектора: 70001 / Пароль: 12345
INSERT INTO users (id, login, password, role_id) VALUES 
(1, '123456789012', '12345', 1),
(2, '70001', '12345', 2);
SELECT setval('users_id_seq', 2);

INSERT INTO taxpayers (id, user_id, inn, full_name, passport_data, region_id) VALUES 
(1, 1, '123456789012', 'Иванов Иван Иванович', '7012 345678', 1);
SELECT setval('taxpayers_id_seq', 1);

INSERT INTO inspectors (id, user_id, full_name, position, dept_code) VALUES 
(1, 2, 'Шаповалова Ольга Васильевна', 'Руководитель отдела', '7000');
SELECT setval('inspectors_id_seq', 1);

INSERT INTO properties (id, taxpayer_id, tax_type_id, property_name, cadastral_number) VALUES 
(1, 1, 1, 'Toyota Camry (А123АА70)', 'CAR-70-2023'),
(2, 1, 2, 'Квартира, 65 кв.м. (г. Томск)', '70:21:0000000:123');
SELECT setval('properties_id_seq', 2);

INSERT INTO payments (taxpayer_id, tax_type_id, property_id, amount, status, payment_date) VALUES 
(1, 1, 1, 12500.00, 'Оплачено', '2026-05-10'),
(1, 2, 2, 2000.00, 'Не оплачено', '2026-07-01');