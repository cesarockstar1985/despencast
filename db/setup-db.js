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
    db.run(`CREATE TABLE IF NOT EXISTS pedidos (
        pedido_id INTEGER PRIMARY KEY AUTOINCREMENT,
        nombre_producto TEXT NOT NULL,
        precio_pedido REAL NOT NULL,
        fecha_pedido TEXT NOT NULL,
        cliente_id INTEGER NOT NULL
    )`, (err) => {
        if (err) {
            return console.error('Error al crear la tabla de pedidos:', err.message);
        }
        console.log('📄 Tabla "pedidos" creada o ya existente.');
    });

});

// Cerrar la conexión a la base de datos
// db.close((err) => {
//     if (err) {
//         return console.error('Error al cerrar la base de datos:', err.message);
//     }
//     console.log('🛑 Conexión a la base de datos cerrada.');
// });

const insertarProducto = (producto) => {
    db.run(`INSERT INTO pedidos (nombre_producto, precio_pedido, fecha_pedido, cliente_id) VALUES (?, ?, ?, ?)`,
        [producto.nombre, producto.precio, producto.fecha, producto.cliente], (err) => {
            if (err) {
                console.error('Error al insertar el producto:', err.message)
                return false;
            }
            console.log('✅ Producto insertado correctamente.');
            return true
        });
}

module.exports = {
    insertarProducto
}