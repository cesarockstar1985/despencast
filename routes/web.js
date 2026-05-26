const authMiddleware = require('../middlewares/authMiddleware');
const authController = require('../controllers/auth');
const express = require('express');
const router = express.Router();
const { getPendingOrders, getClientsWithDebt } = require('../db/adminQueries');
const { registrarCliente } = require('../controllers/clients');
const logger = require('../utils/logger');
const bot = require('../bot');

router.get('/login', authController.showLogin);
router.post('/login', authController.processLogin);
router.get('/logout', authController.logout);

router.use(authMiddleware);

router.get('/', (req, res) => {
    getPendingOrders((err, rows) => {
        if (err) {
            logger.error('Error al cargar pedidos: ' + err.message);
            return res.status(500).send("Error interno del servidor");
        }
        const total = rows.reduce((sum, r) => sum + r.precio_pedido, 0);
        res.render('index.ejs', { pedidos: rows, totalDeuda: total });
    });
});

router.get('/clientes', (req, res) => {
    getClientsWithDebt((err, rows) => {
        if (err) {
            logger.error('Error al cargar clientes: ' + err.message);
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
        logger.error('Error al guardar cliente: ' + error.message);
        res.status(400).json({ success: false, message: "Error al guardar el cliente" });
    }
});

router.post('/clientes/:telegramId/notificar', async (req, res) => {
    const { telegramId } = req.params;
    const { mensaje } = req.body;

    if (!mensaje || mensaje.trim().length === 0) {
        return res.status(400).json({ success: false, message: 'El mensaje no puede estar vacío' });
    }

    try {
        await bot.sendMessage(telegramId, mensaje.trim());
        logger.info(`Notificación enviada a cliente ${telegramId}`);
        res.json({ success: true });
    } catch (error) {
        logger.error('Error al notificar cliente: ' + error.message);
        res.status(500).json({ success: false, message: 'No se pudo enviar el mensaje' });
    }
});

module.exports = router;