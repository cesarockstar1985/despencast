require('dotenv').config(); // Carga las variables de tu .env local
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// El archivo de la base de datos. Se creará si no existe.
const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
    ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
    : path.resolve(__dirname, 'despensa.db');

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) return console.error('Error al abrir la base de datos:', err.message);
    console.log(`✅ Base de datos conectada en: ${dbPath}`);
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
        if (err) {
            return console.error('Error al crear la tabla de pedidos:', err.message);
        }
        console.log('📄 Tabla "pedidos" creada o ya existente.');
    });

    db.run(`CREATE TABLE IF NOT EXISTS clientes (
        telegram_id TEXT PRIMARY KEY, -- Su ID de Telegram para reconocerlo
        nombre_completo TEXT,
        alias TEXT,                   -- Por si le dicen "Juanchi"
        limite_credito REAL DEFAULT 200000, 
        fecha_registro DATETIME DEFAULT CURRENT_TIMESTAMP
    )`, (err) => {
        if (err) {
            return console.error('Error al crear la tabla de usuarios:', err.message);
        }
        console.log('📄 Tabla "usuarios" creada o ya existente.');
    });
});

const insertarProducto = (producto, callback) => {
    db.run(
        `INSERT INTO pedidos (nombre_producto, precio_pedido, fecha_pedido, cliente_id, pagado) VALUES (?, ?, ?, ?, 0)`,
        [producto.nombre, producto.precio, producto.fecha, producto.cliente],
        function(err) { // Usamos function() para poder usar this.lastID si quisieras
            if (err) {
                console.error('Error al insertar el producto:', err.message);
                if (callback) callback(err);
                return;
            }
            console.log('✅ Producto insertado correctamente.');
            if (callback) callback(null, true);
        }
    );
};

const consultarCuentaDb = (cliente, dateObj = {}, callback) => {
    // Consulta para el resumen (suma total)
    const totalQuery = `SELECT
                            COALESCE(SUM(precio_pedido), 0) as total
                        FROM pedidos
                        WHERE cliente_id = ? AND pagado = 0 ${!isEmpty(dateObj)
                            ? ' AND fecha_pedido BETWEEN ? AND ? '
                            : ''}`;

    // Consulta para los detalles de los productos
    const detailQuery = `SELECT
                            nombre_producto as nombre,
                            precio_pedido as precio,
                            strftime('%d/%m/%Y', fecha_pedido, '-3 hours') as fecha,
                            pagado
                        FROM pedidos
                        WHERE cliente_id = ? AND pagado = 0 ${!isEmpty(dateObj)
                            ? ' AND fecha_pedido BETWEEN ? AND ? '
                            : ''}`;

    let totalWhereVals = [cliente];
    let detailWhereVals = [cliente];

    if (!isEmpty(dateObj)) {
        const start = dateObj.start.replace(' ', 'T');
        const end = dateObj.end.replace(' ', 'T');
        totalWhereVals.push(start, end);
        detailWhereVals.push(start, end);
    }

    // Ejecutar la primera consulta (resumen)
    db.all(totalQuery, totalWhereVals, (err, totalRow) => {
        if (err) {
            return callback(err, null);
        }

        // Ejecutar la segunda consulta (detalles)
        db.all(detailQuery, detailWhereVals, (err, detailRows) => {
            if (err) {
                return callback(err, null);
            }

            // Combinar los resultados en un objeto
            const result = {
                total: totalRow[0].total,
                productos: detailRows
            };

            callback(null, result);
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

const pagarCuentaDb = (cliente, callback) => {
    db.run(`UPDATE pedidos SET pagado = 1 WHERE cliente_id = ?`,
        [cliente], (err) => {
            if (err) {
                return callback(err, null)
            }
            callback(null, true)
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