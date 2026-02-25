// routes/web.js
const express = require('express');
const router = express.Router();
const { consultarCuentaDb } = require('../db/setup-db'); 

router.get('/dashboard', (req, res) => {
    // Aquí puedes crear una consulta general en setup-db 
    // o usar la lógica que ya tenemos para listar deudores
    // Por ahora, simulamos la llamada:
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
        : path.resolve(__dirname, '../db/despensa.db');
    
    console.log(dbPath);

    const db = new sqlite3.Database(dbPath);

    db.all(`SELECT * FROM pedidos WHERE pagado = 0`, [], (err, rows) => {
        if (err) return res.status(500).send("Error en DB");
        console.log(rows)
        const total = rows.reduce((sum, r) => sum + r.precio_pedido, 0);
        res.render('index.ejs', { pedidos: rows, totalDeuda: total });
    });
});

module.exports = router;