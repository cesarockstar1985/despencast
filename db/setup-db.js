const sqlite3 = require('sqlite3').verbose();

// El archivo de la base de datos. Se creará si no existe.
const db = new sqlite3.Database('./despensa.db', (err) => {
    if (err) {
        return console.error('Error al abrir la base de datos:', err.message);
    }
    console.log('✅ Conectado a la base de datos SQLite.');
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

});

const insertarProducto = (producto) => {
    db.run(`INSERT INTO pedidos (nombre_producto, precio_pedido, fecha_pedido, cliente_id, pagado) VALUES (?, ?, ?, ?, 0)`,
        [producto.nombre, producto.precio, producto.fecha, producto.cliente], (err) => {
            if (err) {
                console.error('Error al insertar el producto:', err.message)
                return false;
            }
            console.log('✅ Producto insertado correctamente.');
            return true
        });
}

const consultarCuentaDb = (cliente, dateObj = {}, callback) => {
    // Consulta para el resumen (suma total)
    const totalQuery = `SELECT
                            SUM(precio_pedido) as total
                        FROM pedidos
                        WHERE cliente_id = ? AND pagado = 0 ${!isEmpty(dateObj)
                            ? ' AND fecha_pedido BETWEEN ? AND ? '
                            : ''}`;

    // Consulta para los detalles de los productos
    const detailQuery = `SELECT
                            nombre_producto as nombre,
                            precio_pedido as precio
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
    pagarCuentaDb
}