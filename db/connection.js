require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Determinamos la ruta (Local vs Railway)
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
    : path.resolve(__dirname, 'despensa.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('❌ Error al abrir DB:', err.message);
    console.log(`✅ Base de datos conectada en: ${dbPath}`);
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
});

module.exports = db; // Exportamos solo la conexión