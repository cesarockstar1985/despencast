require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// Determinamos la ruta (Local vs Railway)
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
    : path.resolve(__dirname, 'despensa.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return logger.error('Error al abrir DB: ' + err.message);
    logger.info(`Base de datos conectada en: ${dbPath}`);
});

db.serialize(() => {
    // Tabla Clientes (Asegurate que telegram_id sea TEXT y PK)
    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        telegram_id TEXT PRIMARY KEY,
        nombre_completo TEXT,
        alias TEXT,
        limite_credito REAL DEFAULT 200000,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Tabla Pedidos
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_producto TEXT NOT NULL,
        precio_pedido REAL NOT NULL,
        fecha_pedido TEXT NOT NULL,
        cliente_id TEXT NOT NULL, -- Cambiado a TEXT para machear con telegram_id
        pagado INTEGER NOT NULL DEFAULT 0 CHECK(pagado IN (0, 1)),
        FOREIGN KEY (cliente_id) REFERENCES clientes(telegram_id)
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS admin_users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        username TEXT UNIQUE,
        password TEXT,
        role TEXT DEFAULT 'admin'
    )`, () => {
        const adminUsername = process.env.ADMIN_USERNAME || 'admin';
        const adminPassword = process.env.ADMIN_PASSWORD;

        if (!adminPassword) return;

        const bcrypt = require('bcrypt');
        db.get('SELECT id FROM admin_users WHERE username = ?', [adminUsername], (err, row) => {
            if (err || row) return;
            bcrypt.hash(adminPassword, 10, (err, hash) => {
                if (err) return logger.error('Error al hashear password del admin: ' + err.message);
                db.run('INSERT INTO admin_users (username, password) VALUES (?, ?)', [adminUsername, hash], () => {
                    logger.info(`Admin "${adminUsername}" creado automáticamente.`);
                });
            });
        });
    });
});

module.exports = db;