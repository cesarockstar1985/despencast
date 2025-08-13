const TelegramBot = require('node-telegram-bot-api');
const start = require('./controllers/telegram');
const { leerSheet, sheetLookUp } = require('./leerSheet');

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
    console.log(producto)
    const productSheet = await sheetLookUp(producto);
    
  }

});

// 3. MENSAJE PARA SABER QUE EL SCRIPT ESTÁ CORRIENDO
console.log('🤖 Bot iniciado. Esperando la hora programada para enviar notificaciones...');