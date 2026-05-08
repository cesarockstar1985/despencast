require('dotenv').config();
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const logger = require('../utils/logger');

// El archivo de la base de datos. Se creará si no existe.
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
    : path.resolve(__dirname, 'despensa.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return logger.error('Error al abrir la base de datos: ' + err.message);
    logger.info(`Base de datos conectada en: ${dbPath}`);
});

// db.serialize() asegura que los comandos se ejecuten en orden.
db.serialize(() => {
    // 1. Crear la tabla de pedidos si no existe
    // db.run('DROP TABLE IF EXISTS pedidos;'); 
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_producto TEXT NOT NULL,
        precio_pedido REAL NOT NULL,
        fecha_pedido TEXT NOT NULL,
        cliente_id INTEGER NOT NULL,
        pagado INTEGER NOT NULL DEFAULT 0 CHECK(pagado IN (0, 1))
    )`, (err) => {
        if (err) return logger.error('Error al crear la tabla de pedidos: ' + err.message);
        logger.info('Tabla "pedidos" lista.');
    });

    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        telegram_id TEXT PRIMARY KEY,
        nombre_completo TEXT,
        alias TEXT,
        limite_credito REAL DEFAULT 200000,
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) return logger.error('Error al crear la tabla de clientes: ' + err.message);
        logger.info('Tabla "clientes" lista.');
    });
});

const insertarProducto = (producto) => {
    return new Promise((resolve, reject) => {
        db.run(
            `INSERT INTO pedidos (nombre_producto, precio_pedido, fecha_pedido, cliente_id, pagado) VALUES (?, ?, ?, ?, 0)`,
            [producto.nombre, producto.precio, producto.fecha, producto.cliente],
            function(err) {
                if (err) return reject(err);
                resolve(this.lastID);
            }
        );
    });
};

const consultarCuentaDb = (cliente, dateObj = {}) => {
    const dateFilter = !isEmpty(dateObj) ? ' AND fecha_pedido BETWEEN ? AND ? ' : '';

    const totalQuery = `SELECT
                            COALESCE(SUM(precio_pedido), 0) as total
                        FROM pedidos
                        WHERE cliente_id = ? AND pagado = 0 ${dateFilter}`;

    const detailQuery = `SELECT
                            nombre_producto as nombre,
                            precio_pedido as precio,
                            strftime('%d/%m/%Y', fecha_pedido, '-3 hours') as fecha,
                            pagado
                        FROM pedidos
                        WHERE cliente_id = ? AND pagado = 0 ${dateFilter}`;

    let whereVals = [cliente];
    if (!isEmpty(dateObj)) {
        const start = dateObj.start.replace(' ', 'T');
        const end = dateObj.end.replace(' ', 'T');
        whereVals.push(start, end);
    }

    return new Promise((resolve, reject) => {
        db.serialize(() => {
            db.run('BEGIN');
            db.all(totalQuery, whereVals, (err, totalRow) => {
                if (err) {
                    db.run('ROLLBACK');
                    return reject(err);
                }
                db.all(detailQuery, whereVals, (err, detailRows) => {
                    if (err) {
                        db.run('ROLLBACK');
                        return reject(err);
                    }
                    db.run('COMMIT');
                    resolve({ total: totalRow[0].total, productos: detailRows });
                });
            });
        });
    });
};

const obtenerCliente = (telegram_id) => {
    return new Promise((resolve, reject) => {
        const query = `SELECT * FROM clientes WHERE telegram_id = ?`;
        db.get(query, [telegram_id], (err, row) => {
            if (err) reject(err);
            resolve(row); // Retorna el objeto del cliente o 'undefined' si no existe
        });
    });
}

const pagarCuentaDb = (cliente) => {
    return new Promise((resolve, reject) => {
        db.run(`UPDATE pedidos SET pagado = 1 WHERE cliente_id = ?`, [cliente], (err) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}


function isEmpty(obj) {
  return Object.keys(obj).length === 0;
}

module.exports = {
    insertarProducto,
    consultarCuentaDb,
    pagarCuentaDb,
    obtenerCliente,
    db
}