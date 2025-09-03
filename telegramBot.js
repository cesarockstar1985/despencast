const TelegramBot = require('node-telegram-bot-api');
const { start, consultarCuenta, pagarCuenta, busquedaPorRango } = require('./controllers/telegram');
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
    { command: 'rango_cuenta', description: 'Verificar cuenta por rango de fecha' },
    { command: 'rango_detalle', description: 'Verificar detalle de compra' },
    { command: 'pagar', description: 'Marcar deuda como pagada' },
];

const userSelections = {};

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
  console.log(msg)
  leerSheet(bot, msg)
});

bot.onText(/\/buscar (.+)/, (msg, match) => {
  const searchTerm = match[1];
  leerSheet(bot, msg, searchTerm)
});

bot.onText(/\/cuenta/, (msg) => {
  consultarCuenta(msg, bot)
});

bot.onText(/\/pagar/, (msg) => {
  pagarCuenta(msg, bot)
});

bot.onText(/\/rango_cuenta/, (msg) => {
   const chatId = msg.chat.id;
  // Reiniciamos la selección para este usuario
  userSelections[chatId] = { start: null, end: null };
  
  const today = new Date();
  bot.sendMessage(chatId, 'Selecciona la fecha de **inicio**:', {
    ...createRangeCalendar(today),
    parse_mode: 'Markdown'
  });
});

bot.on('callback_query', async (callbackQuery) => {
  const msg    = callbackQuery.message;
  const data   = callbackQuery.data; // Este es el callback_data que definiste en los botones
  const chatId = callbackQuery.message.chat.id;

  // Responde al callback para que el cliente de Telegram sepa que se procesó.
  bot.answerCallbackQuery(callbackQuery.id);

  if(data === 'rango_cuenta'){
     const chatId = msg.chat.id;
    // Reiniciamos la selección para este usuario
    userSelections[chatId] = { start: null, end: null };
    
    const today = new Date();
    bot.sendMessage(chatId, 'Selecciona la fecha de **inicio**:', {
      ...createRangeCalendar(today),
      parse_mode: 'Markdown'
    });
  }

  // Lógica para manejar cada botón
  if (data === 'productos_precios') {
    leerSheet(bot, msg)
  }

  if(data === 'estado_cuenta'){
    consultarCuenta(callbackQuery.message, bot)
  }

  if(data.includes('insertar_producto_')){
    let producto = data.replace('insertar_producto_', '')
    producto = producto.replaceAll('_', ' ')
    const productSheetDataRaw = await sheetLookUp(producto);
    const { text:productData } = productSheetDataRaw[0][0];
    const productName = toTitleCase(productData.split(':')[0]);
    const productPrice = parseInt(productData.split(':')[1].replace('Gs', '').replace('.', ''));
    const currentDate =  getCurrentDate();
    
    insertarProducto({
      nombre: productName,
      precio: productPrice,
      fecha: currentDate,
      cliente: chatId
    });

    // if(insert){
    bot.sendMessage(chatId, 'Se ingresó el producto correctamente.')
    // }
  }

  if (data === 'ignore') {
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }
  
  // Si el usuario quiere limpiar la selección
  if (data === 'clear_selection') {
    userSelections[chatId] = { start: null, end: null };
    const today = new Date();
    bot.editMessageText('Selección reiniciada. Por favor, selecciona la fecha de **inicio**:', {
      chat_id: chatId,
      message_id: msg.message_id,
      ...createRangeCalendar(today),
      parse_mode: 'Markdown'
    });
    bot.answerCallbackQuery(callbackQuery.id);
    return;
  }

  // Manejar la selección de fechas
  if (data.startsWith('range_')) {
    let selectedDate = '';
    
    // Si aún no hay fecha de inicio, la establecemos
    if (!userSelections[chatId] || !userSelections[chatId].start) {
      selectedDate = data.substring(6) + ' 00:00:00';
      userSelections[chatId] = { start: selectedDate, end: null };
      const today = new Date(selectedDate); // Mostramos el calendario del mes seleccionado
      
      bot.editMessageText('✅ Fecha de inicio: `' + selectedDate + '`\n\nSelecciona la fecha de **fin**:', {
        chat_id: chatId,
        message_id: msg.message_id,
        ...createRangeCalendar(today, selectedDate),
        parse_mode: 'Markdown'
      });
    } else { // Si ya hay fecha de inicio, esta es la de fin
      selectedDate = data.substring(6) + ' 23:59:59';
      const startDate = userSelections[chatId].start;
      const endDate = selectedDate;

      // Validación simple: la fecha de fin no puede ser anterior a la de inicio
      if (new Date(endDate) < new Date(startDate)) {
        bot.answerCallbackQuery(callbackQuery.id, { text: 'La fecha de fin no puede ser anterior a la de inicio.', show_alert: true });
        return;
      }
      
      userSelections[chatId].end = endDate;

      consultarCuenta(msg, bot, {start: startDate, end: endDate})
      
      bot.editMessageText(`✅ Rango seleccionado:\n\n*Inicio:* \`${startDate}\`\n*Fin:* \`${endDate}\``, {
        chat_id: chatId,
        message_id: msg.message_id,
        parse_mode: 'Markdown'
      });
      
      // Limpiamos el estado para este usuario
      delete userSelections[chatId];
    }
    
    bot.answerCallbackQuery(callbackQuery.id);
  }

  // Manejar la navegación entre meses
  if (data.startsWith('nav_')) {
    const [year, month] = data.substring(4).split('-').map(Number);
    const newDate = new Date(year, month, 1);
    const startDate = userSelections[chatId] ? userSelections[chatId].start : null;
    
    bot.editMessageReplyMarkup(createRangeCalendar(newDate, startDate).reply_markup, {
      chat_id: chatId,
      message_id: msg.message_id,
    }).catch(() => {});
    
    bot.answerCallbackQuery(callbackQuery.id);
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

const createRangeCalendar = (date, startDate = null) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
  const dayNames = ["L", "M", "X", "J", "V", "S", "D"];

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startingDay = (firstDay === 0) ? 6 : firstDay - 1;

  let keyboard = [];
  keyboard.push([{ text: `${monthNames[month]} ${year}`, callback_data: 'ignore' }]);
  keyboard.push(dayNames.map(day => ({ text: day, callback_data: 'ignore' })));

  let week = [];
  for (let i = 0; i < startingDay; i++) {
    week.push({ text: ' ', callback_data: 'ignore' });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    let dayText = String(day);

    // Resaltar la fecha de inicio si está seleccionada
    if (startDate && dateString === startDate) {
      dayText = `[ ${day} ]`;
    }

    week.push({ text: dayText, callback_data: `range_${dateString}` });

    if (week.length === 7) {
      keyboard.push(week);
      week = [];
    }
  }

  if (week.length > 0) {
    while (week.length < 7) {
      week.push({ text: ' ', callback_data: 'ignore' });
    }
    keyboard.push(week);
  }

  const prevMonth = new Date(year, month - 1, 1);
  const nextMonth = new Date(year, month + 1, 1);
  const prevMonthStr = `${prevMonth.getFullYear()}-${prevMonth.getMonth()}`;
  const nextMonthStr = `${nextMonth.getFullYear()}-${nextMonth.getMonth()}`;
  
  // Añadimos un botón para limpiar la selección
  const navRow = [
    { text: '◀️ Anterior', callback_data: `nav_${prevMonthStr}` },
    { text: 'Siguiente ▶️', callback_data: `nav_${nextMonthStr}` }
  ];
  
  // Solo mostramos el botón de limpiar si ya se ha seleccionado una fecha de inicio
  if (startDate) {
    navRow.unshift({ text: '❌ Limpiar', callback_data: 'clear_selection' });
  }

  keyboard.push(navRow);

  return {
    reply_markup: {
      inline_keyboard: keyboard,
    },
  };
}

// 3. MENSAJE PARA SABER QUE EL SCRIPT ESTÁ CORRIENDO
console.log('🤖 Bot iniciado. Esperando la hora programada para enviar notificaciones...');