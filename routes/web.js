const authMiddleware = require('../middlewares/authMiddleware');
const authController = require('../controllers/auth');
// routes/web.js
const express = require('express');
const router = express.Router();
const { getPendingOrders, getClientsWithDebt } = require('../db/adminQueries');
const { registrarCliente } = require('../controllers/clients');

router.get('/login', authController.showLogin);
router.post('/login', authController.processLogin);
router.get('/logout', authController.logout);

router.use(authMiddleware);

router.get('/', (req, res) => {
    getPendingOrders((err, rows) => {
        if (err) {
            console.error('Error al cargar pedidos:', err.message);
            return res.status(500).send("Error interno del servidor");
        }
        const total = rows.reduce((sum, r) => sum + r.precio_pedido, 0);
        res.render('index.ejs', { pedidos: rows, totalDeuda: total });
    });
});

router.get('/clientes', (req, res) => {
    getClientsWithDebt((err, rows) => {
        if (err) {
            console.error('Error al cargar clientes:', err.message);
            return res.status(500).send("Error interno del servidor");
        }
        res.render('clients.ejs', { clientes: rows });
    });
});

router.get('/clientes/create', (req, res) => {
    res.render('new-client.ejs');
});

// Acción de guardar el cliente (POST)
router.post('/clientes/guardar', async (req, res) => {
    const { telegramId, name, update } = req.body;
    
    try {
        await registrarCliente({telegramId, name, update});
        res.json({ success: true, message: 'Cliente registrado correctamente' });
    } catch (error) {
        console.error('Error al guardar cliente:', error.message);
        res.status(400).json({ success: false, message: "Error al guardar el cliente" });
    }
});

module.exports = router;