const TelegramBot = require('node-telegram-bot-api');
const axios = require('axios');
const { Jimp } = require('jimp'); // Asegúrate de tener la v1.x o superior
const { 
    MultiFormatReader, 
    BarcodeFormat, 
    DecodeHintType, 
    RGBLuminanceSource, 
    BinaryBitmap, 
    HybridBinarizer,
    GlobalHistogramBinarizer 
} = require('@zxing/library');

const { start, consultarCuenta, pagarCuenta } = require('./controllers/telegram');
const { leerSheet, sheetLookUp } = require('./leerSheet');
const { insertarProducto } = require('./db/setup-db');

require('dotenv').config();

const { TELEGRAM_TOKEN } = process.env;

// Estado para saber si estamos esperando una foto
const waitingForBarcode = new Set();
const userSelections = {};

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

    if (!waitingForBarcode.has(chatId)) return;
    
    waitingForBarcode.delete(chatId);
    const photo = msg.photo[msg.photo.length - 1];

    try {
        bot.sendMessage(chatId, '🔍 Procesando imagen...');

        // 1. Descarga con Axios forzando IPv4 y Timeout
        const fileLink = await bot.getFileLink(photo.file_id);
        const response = await axios.get(fileLink, {
            responseType: 'arraybuffer',
            timeout: 20000,
            family: 4
        });

        // 2. Procesamiento con Jimp (Sintaxis v1.x)
        const image = await Jimp.read(Buffer.from(response.data));
        
        image.resize({ w: 800 }); // Tamaño ideal para balancear velocidad/detalle
        image.greyscale();
        image.contrast(0.8);
        image.normalize();

        // 3. Preparar datos para ZXing (Extracción manual de luminancia)
        const width = image.bitmap.width;
        const height = image.bitmap.height;
        const data = image.bitmap.data;
        const lumaBuffer = new Uint8ClampedArray(width * height);

        for (let i = 0; i < data.length; i += 4) {
            // Fórmula de luminancia: (R+G+B)/3
            lumaBuffer[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
        }

        const luminanceSource = new RGBLuminanceSource(lumaBuffer, width, height);
        const hints = new Map();
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, 
            BarcodeFormat.CODE_128, BarcodeFormat.UPC_A, BarcodeFormat.QR_CODE
        ]);
        hints.set(DecodeHintType.TRY_HARDER, true);

        const reader = new MultiFormatReader();
        let result = null;

        // 4. Triple Intento de lectura
        try {
            // Intento 1: Hybrid (Estándar)
            result = reader.decode(new BinaryBitmap(new HybridBinarizer(luminanceSource)), hints);
        } catch (e) {
            try {
                // Intento 2: Global Histogram (Mejor para fotos con sombras)
                result = reader.decode(new BinaryBitmap(new GlobalHistogramBinarizer(luminanceSource)), hints);
            } catch (e2) {
                // Intento 3: Invertir colores (Códigos claros sobre fondo oscuro)
                luminanceSource.invert();
                result = reader.decode(new BinaryBitmap(new HybridBinarizer(luminanceSource)), hints);
            }
        }

        if (result) {
            const code = result.getText();
            bot.sendMessage(chatId, `✅ ¡Código detectado: \`${code}\`!\n🔍 Buscando producto...`, { parse_mode: 'Markdown' });
            // Llamada a tu función de búsqueda en Google Sheets
            leerSheet(bot, msg, {searchTerm: code, isBarcode: true});
        }

    } catch (error) {
        if (error.name === 'NotFoundException' || error.message.includes('No MultiFormat')) {
            bot.sendMessage(chatId, '❌ No se pudo detectar el código. Intenta con más luz y evita reflejos.');
        } else {
            console.error('Error:', error);
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

// --- Utilidades ---

const toTitleCase = (str) => {
    return str.toLowerCase().split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
};

console.log('🤖 Bot de productos iniciado con éxito...');

module.exports = bot;