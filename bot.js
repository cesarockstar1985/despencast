const TelegramBot = require('node-telegram-bot-api');

const { start, consultarCuenta, pagarCuenta } = require('./controllers/telegram');
const { leerSheet, sheetLookUp } = require('./leerSheet');
const { insertarProducto, obtenerCliente} = require('./db/setup-db');

require('dotenv').config();

const { TELEGRAM_TOKEN } = process.env;

// Estado para saber si estamos esperando una foto
const waitingForBarcode = new Set();

// Inicializa el bot de Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, {
    polling: true,
    request: {
        family: 4, // Forzar IPv4 para evitar errores de red
    }
});

// Comandos del bot
const misComandos = [
    { command: 'start', description: 'Menú principal' },
    { command: 'barcode', description: 'Escanear código de barras' },
    { command: 'catalogo', description: 'Ver el catálogo de productos' },
    { command: 'buscar', description: 'Buscar producto por nombre' },
    { command: 'cuenta', description: 'Verificar cuenta' },
    { command: 'pagar', description: 'Marcar deuda como pagada' },
];

bot.setMyCommands(misComandos);

// --- Manejadores de Comandos ---

bot.onText(/\/start/, (msg) => start(msg, bot));

bot.onText(/\/catalogo/, (msg) => leerSheet(bot, msg));

bot.onText(/\/buscar (.+)/, (msg, match) => {
    leerSheet(bot, msg, {searchTerm: match[1], isBarcode: false});
});

bot.onText(/\/cuenta/, (msg) => consultarCuenta(msg, bot));

bot.onText(/\/pagar/, (msg) => pagarCuenta(msg, bot));

bot.onText(/\/barcode/, (msg) => {
    const chatId = msg.chat.id;
    waitingForBarcode.add(chatId);
    bot.sendMessage(chatId, '📸 Envíame una foto clara del código de barras.');
});

// --- Lógica de Procesamiento de Imagen ---
bot.on('photo', async (msg) => {
    const chatId = msg.chat.id;

    // 1. Validación de estado
    if (!waitingForBarcode.has(chatId)) return;
    
    try {
        const photo = msg.photo[msg.photo.length - 1];
        await bot.sendMessage(chatId, '🔍 Procesando imagen...');

        // 2. Delegamos la lógica pesada al servicio
        const fileLink = await bot.getFileLink(photo.file_id);
        const code = await BarcodeService.decodeFromUrl(fileLink);

        // 3. Éxito: Limpiamos estado y buscamos en el sheet
        waitingForBarcode.delete(chatId);
        bot.sendMessage(chatId, `✅ ¡Código detectado: \`${code}\`!\n🔍 Buscando producto...`, { parse_mode: 'Markdown' });
        
        leerSheet(bot, msg, { searchTerm: code, isBarcode: true });

    } catch (error) {
        // 4. Manejo de errores específicos
        if (error.message === 'NOT_FOUND') {
            bot.sendMessage(chatId, '❌ No se pudo detectar el código. Intenta con más luz y evita reflejos.');
        } else {
            console.error('Error en procesamiento:', error);
            bot.sendMessage(chatId, '❌ Error técnico al procesar la imagen.');
        }
    }
});

// --- Manejo de Callbacks (Calendario y Botones) ---
bot.on('callback_query', async (callbackQuery) => {
    const msg = callbackQuery.message;
    const data = callbackQuery.data;
    const chatId = msg.chat.id;

    bot.answerCallbackQuery(callbackQuery.id);

    if (data === 'productos_precios') {
        leerSheet(bot, msg, {searchTerm: '', isBarcode: false});
    }

    if (data === 'estado_cuenta') {
        consultarCuenta(msg, bot);
    }

    if (data.includes('insertar_producto_')) {
        let producto = data.replace('insertar_producto_', '').replaceAll('_', ' ');
        const productSheetDataRaw = await sheetLookUp({ searchTerm: producto, isBarcode: false });
        const { text: productData } = productSheetDataRaw[0][0];
        
        const productName = toTitleCase(productData.split(':')[0]);
        const productPrice = parseInt(productData.split(':')[1].replace('Gs', '').replace(/\./g, ''));
        
        insertarProducto({
            nombre: productName,
            precio: productPrice,
            fecha: new Date().toISOString(),
            cliente: chatId
        });

        bot.sendMessage(chatId, `✅ Registrado: ${productName}`);
    }
    
    // (Aquí puedes añadir el resto de tu lógica de calendario/rango_cuenta...)
});

bot.on('message', async (msg) => {
    const chatId = msg.chat.id.toString();
    const text = msg.text;

    // 1. Chequeamos si el usuario existe
    const cliente = await obtenerCliente(chatId);

    if (!cliente) {
        // Caso: Usuario NO registrado
        if (text === '/start') {
            bot.sendMessage(chatId, `¡Hola! Soy el sistema de DespenCast. Veo que no estás registrado. Por favor, pedile al dueño de la despensa que te dé de alta con este id \`${chatId}\` para empezar a usar el bot.`, { parse_mode: 'Markdown' });
        } else {
            bot.sendMessage(chatId, "⚠️ Acceso denegado. Tu usuario no está registrado en el sistema.");
        }
        return; // Detenemos la ejecución aquí
    }
});

// --- Utilidades ---
const toTitleCase = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

console.log('🤖 Bot de productos iniciado con éxito...');

module.exports = bot;