const TelegramBot = require('node-telegram-bot-api');
const Actions = require('./controllers/botActions');
const { consultarCuenta, pagarCuenta } = require('./controllers/telegram');
const { leerSheet } = require('./leerSheet');
const { obtenerCliente} = require('./db/setup-db');
const { decodeBarcode } = require('./services/barcodeService');

require('dotenv').config();

const { TELEGRAM_TOKEN } = process.env;
const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
    request: {
        family: 4,
    }
});

const waitingForBarcode = new Set();

// --- Middleware de Seguridad ---
const withAuth = async (msg, callback) => {
    const cliente = await obtenerCliente(msg.chat.id.toString());
    if (!cliente) return Actions.sendError(bot, msg.chat.id, 'auth');
    return callback();
};

// --- Manejadores de Comandos ---
bot.onText(/\/start/, (msg) => withAuth(msg, () => Actions.handleStart(bot, msg)));
bot.onText(/\/barcode/, (msg) => withAuth(msg, () => Actions.handleBarcodeRequest(bot, msg, waitingForBarcode)));
bot.onText(/\/catalogo/, (msg) => withAuth(msg, () => leerSheet(bot, msg)));
bot.onText(/\/buscar (.+)/, (msg, match) => withAuth(msg, () => Actions.handleSearch(bot, msg, match)));
bot.onText(/\/cuenta/, (msg) => withAuth(msg, () => consultarCuenta(msg, bot)));
bot.onText(/\/pagar/, (msg) => withAuth(msg, () => pagarCuenta(msg, bot)));

// --- Procesamiento de Imagen ---
bot.on('photo', async (msg) => {
    await withAuth(msg, async () => {
        try {
            const photo = msg.photo[msg.photo.length - 1];
            const fileLink = await bot.getFileLink(photo.file_id);
            
            bot.sendMessage(msg.chat.id, '🔍 Procesando...');
            const code = await decodeBarcode(fileLink);
            
            waitingForBarcode.delete(msg.chat.id);
            bot.sendMessage(msg.chat.id, `✅ Código: \`${code}\``, { parse_mode: 'Markdown' });
            leerSheet(bot, msg, { searchTerm: code, isBarcode: true });

        } catch (error) {
            Actions.sendError(bot, msg.chat.id, error.message === 'NOT_FOUND' ? 'image' : 'tech');
        }
    });
});

// --- Manejo de Callbacks (Calendario y Botones) ---
bot.on('callback_query', (query) => withAuth(query.message, () => Actions.handleCallback(bot, query)));

// --- Utilidades ---
const toTitleCase = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

console.log('🤖 Bot de productos iniciado con éxito...');

module.exports = bot;