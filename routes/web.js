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
    
    const db = new sqlite3.Database(dbPath);

    db.all(`SELECT * FROM pedidos WHERE pagado = 0`, [], (err, rows) => {
        if (err) return res.status(500).send("Error en DB");
        console.log(rows)
        const total = rows.reduce((sum, r) => sum + r.precio_pedido, 0);
        res.render('index.ejs', { pedidos: rows, totalDeuda: total });
    });
});

router.get('/clientes', (req, res) => {
    const sqlite3 = require('sqlite3').verbose();
    const path = require('path');
    const dbPath = process.env.RAILWAY_VOLUME_MOUNT_PATH 
        ? path.join(process.env.RAILWAY_VOLUME_MOUNT_PATH, 'despensa.db') 
        : path.resolve(__dirname, '../db/despensa.db');
    
    const db = new sqlite3.Database(dbPath);

    // Consultamos los clientes y, de paso, cuánto debe cada uno (opcional pero pro)
    const query = `
        SELECT c.*, IFNULL(SUM(CASE WHEN p.pagado = 0 THEN p.precio_pedido ELSE 0 END), 0) as deuda_actual
        FROM clientes c
        LEFT JOIN pedidos p ON c.telegram_id = p.cliente_id
        GROUP BY c.telegram_id
    `;

    db.all(query, [], (err, rows) => {
        if (err) return res.status(500).send("Error al cargar clientes");
        res.render('clientes.ejs', { clientes: rows });
    });
});

router.get('/clientes/nuevo', (req, res) => {
    res.render('nuevo-cliente.ejs');
});

// Acción de guardar el cliente (POST)
router.post('/clientes/guardar', async (req, res) => {
    const { telegram_id, nombre, alias, limite } = req.body;
    
    try {
        await registrarCliente(telegram_id, nombre, alias, parseFloat(limite));
        // Redireccionamos a la lista de clientes con un mensaje de éxito
        res.redirect('/clientes?mensaje=registrado');
    } catch (error) {
        res.status(500).send("Error al guardar el cliente: " + error.message);
    }
});

module.exports = router;