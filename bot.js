const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const logger = require('./utils/logger');
const Actions = require('./controllers/botActions');
const { consultarCuenta, pagarCuenta } = require('./controllers/telegram');
const { leerSheet, sheetLookUp } = require('./leerSheet');
const { pendingBarcodeAssignment } = require('./services/adminState');
const { obtenerCliente} = require('./db/setup-db');
const { decodeBarcode } = require('./services/barcodeService');

require('dotenv').config();

const { TELEGRAM_TOKEN, ADMIN_CHAT_ID } = process.env;
const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
    request: {
        family: 4,
    }
});

// --- Middleware de Seguridad ---
const withAuth = async (msg, callback) => {
    const cliente = await obtenerCliente(msg.chat.id.toString());
    if (!cliente) return Actions.sendError(bot, msg.chat.id, 'auth');
    return callback();
};

// --- Manejadores de Comandos ---
bot.onText(/\/start/, (msg) => withAuth(msg, () => Actions.handleStart(bot, msg)));
bot.onText(/\/barcode/, (msg) => withAuth(msg, () => Actions.handleBarcodeRequest(bot, msg)));
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
            const imageResponse = await axios.get(fileLink, { responseType: 'arraybuffer' });
            const imageBuffer = Buffer.from(imageResponse.data);

            bot.sendMessage(msg.chat.id, '🔍 Procesando...');
            const code = await decodeBarcode(imageBuffer);

            const chatId = msg.chat.id;
            const isAdmin = ADMIN_CHAT_ID && chatId.toString() === ADMIN_CHAT_ID.toString();
            const found = await sheetLookUp({ searchTerm: code, isBarcode: true });

            if (isAdmin && (!found || found.length === 0)) {
                pendingBarcodeAssignment.set(chatId.toString(), code);
                await bot.sendMessage(chatId,
                    `⚠️ Código \`${code}\` no encontrado en la planilla.\n\n¿Deseas asignarlo a un producto?`,
                    {
                        parse_mode: 'Markdown',
                        reply_markup: {
                            inline_keyboard: [[
                                { text: '✅ Sí, asignar', callback_data: 'admin_asignar_barcode' },
                                { text: '❌ Cancelar', callback_data: 'cancelar_producto' },
                            ]]
                        }
                    }
                );
            }

            if(!isAdmin && (!found || found.length === 0)){
                await bot.sendMessage(chatId,
                    `❌ Producto no registrado en la planilla.`,
                    { parse_mode: 'Markdown' }
                );
            }

            if (found && found.length > 0) {
                leerSheet(bot, msg, { searchTerm: code, isBarcode: true });
            }

        } catch (error) {
            Actions.sendError(bot, msg.chat.id, error.message === 'NOT_FOUND' ? 'image' : 'tech');
        }
    });
});

// --- Manejo de Callbacks (Calendario y Botones) ---
bot.on('callback_query', (query) => withAuth(query.message, () => Actions.handleCallback(bot, query)));

logger.info('Bot de Telegram iniciado.');

module.exports = bot;