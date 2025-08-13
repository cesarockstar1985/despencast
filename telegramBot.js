const TelegramBot = require('node-telegram-bot-api');
const start = require('./controllers/telegram');
const { leerSheet, sheetLookUp } = require('./leerSheet');
const { insertarProducto } = require('./db/setup-db');

require('dotenv').config();

const { TELEGRAM_TOKEN } = process.env;

// Inicializa el bot de Telegram
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

bot.onText(/\/start/, (msg) => start(msg, bot));

const misComandos = [
    { command: 'start', description: 'Menú principal' },
    { command: 'catalogo', description: 'Ver el catálogo interactivo de productos' },
    { command: 'buscar', description: 'Buscar un producto por su nombre' },
    { command: 'cuenta', description: 'Verificar cuenta' },
];

// Configura los comandos al iniciar el bot.
// Esto sobreescribirá cualquier comando que hayas puesto con BotFather.
bot.setMyCommands(misComandos)
    .then(() => {
        console.log('✅ Comandos configurados exitosamente en Telegram.');
    })
    .catch((error) => {
        console.error('Error configurando los comandos:', error);
    });

console.log('🤖 Bot de productos iniciado...');

bot.onText(/\/catalogo/, (msg) => {
  leerSheet(bot)
});

bot.onText(/\/buscar (.+)/, (msg, match) => {
  const searchTerm = match[1];
  leerSheet(bot, searchTerm)
});

bot.on('callback_query', async (callbackQuery) => {
  const data = callbackQuery.data; // Este es el callback_data que definiste en los botones

  // Responde al callback para que el cliente de Telegram sepa que se procesó.
  bot.answerCallbackQuery(callbackQuery.id);

  // Lógica para manejar cada botón
  if (data === 'productos_precios') {
    leerSheet(bot)
  }

  if(data.includes('insertar_producto_')){
    let producto = data.replace('insertar_producto_', '')
    producto = producto.replaceAll('_', ' ')
    const productSheetDataRaw = await sheetLookUp(producto);
    const { text:productData } = productSheetDataRaw[0][0];
    const productName = toTitleCase(productData.split(':')[0]);
    const productPrice = parseInt(productData.split(':')[1].replace('Gs', '').replace('.', ''));
    const userId = callbackQuery.message.from.id;
    const currentDate =  getCurrentDate();
    
    const insert = insertarProducto({
      nombre: productName,
      precio: productPrice,
      fecha: currentDate,
      cliente: userId
    });

    console.log(insert)
  }

});

const toTitleCase = (str) => {
  // 1. Convertimos todo a minúsculas y dividimos el string en un array de palabras.
  return str.toLowerCase().split(' ').map(function(word) {
    // 2. Para cada palabra, tomamos la primera letra, la ponemos en mayúscula
    //    y la unimos con el resto de la palabra.
    return word.charAt(0).toUpperCase() + word.slice(1);
  }).join(' '); // 3. Unimos todas las palabras modificadas con un espacio en medio.
}

const getCurrentDate = () => {
    // 1. Obtiene la fecha y hora actuales
    const fechaActual = new Date();

    // 2. La convierte a un string en formato ISO 8601
    const fechaParaDB = fechaActual.toISOString();

    return fechaParaDB
}

// 3. MENSAJE PARA SABER QUE EL SCRIPT ESTÁ CORRIENDO
console.log('🤖 Bot iniciado. Esperando la hora programada para enviar notificaciones...');