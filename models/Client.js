const db = require('../db/connection'); // Tu archivo de conexión existente

const Cliente = {
    // Buscar todos
    all: () => {
        return new Promise((resolve, reject) => {
            db.all("SELECT * FROM clientes", [], (err, rows) => {
                if (err) reject(err);
                resolve(rows);
            });
        });
    },

    // El INSERT que necesitabas
    create: (datos) => {
        return new Promise((resolve, reject) => {
            const { telegram_id, nombre, alias, limite } = datos;
            const sql = `INSERT INTO clientes (telegram_id, nombre_completo, alias, limite_credito) 
                         VALUES (?, ?, ?, ?)`;
            db.run(sql, [telegram_id, nombre, alias, limite], function(err) {
                if (err) reject(err);
                resolve(this.lastID);
            });
        });
    },

    getByTelegramId: (telegramId) => {
        return new Promise((resolve, reject) => {
            const sql = "SELECT * FROM clientes WHERE telegram_id = ?";
            
            db.get(sql, [telegramId], (err, row) => {
                if (err) {
                    console.error("❌ Error en la consulta SQL:", err.message);
                    reject(err);
                }
                // Si lo encuentra, devuelve el objeto. Si no, devuelve undefined.
                resolve(row); 
            });
        });
    },

    getByName: (name) => {
        return new Promise((resolve, reject) => {
            const sql = "SELECT * FROM clientes WHERE nombre_completo = ?";
            
            db.get(sql, [name], (err, row) => {
                if (err) {
                    console.error("❌ Error en la consulta SQL:", err.message);
                    reject(err);
                }
                // Si lo encuentra, devuelve el objeto. Si no, devuelve undefined.
                resolve(row); 
            });
        });
    },

};

module.exports = Cliente;