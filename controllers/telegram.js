const { consultarCuentaDb, pagarCuentaDb } = require('../db/setup-db');
const logger = require('../utils/logger');

const start = (msg, bot) => {
  const chatId = msg.chat.id;
  const name = msg.from.first_name;

  const texto = `Hola ${name} 👋👋! Soy tu asistente de DespenCast. ¿Qué te gustaría hacer?`;

  // Opciones del teclado inline
  const opciones = {
    reply_markup: {
      inline_keyboard: [
        [
          // Cada objeto es un botón. `text` es lo que ve el usuario, `callback_data` es lo que recibes tú.
          { text: '🍕 Ver Productos', callback_data: 'productos_precios' },
          { text: '📦 Cuenta', callback_data: 'estado_cuenta' },
          { text: '📅 Cuenta por Rango', callback_data: 'rango_cuenta' }
        ]
      ]
    }
  };

  // Enviar el mensaje con el teclado inline
  bot.sendMessage(chatId, texto, opciones);
};

const consultarCuenta = async (msg, bot, dateObject = {}) => {
  const userId = msg.chat.id;
  try {
    const { total, productos } = await consultarCuentaDb(userId, dateObject);

    let text = '*Detalle de cuenta*\n\n';
    text += '```\n';
    text += 'Nro.  Fecha         Producto         Precio\n';
    text += '----------------------------------------------\n';

    if (productos.length > 0) {
      productos.forEach((producto, indice) => {
        const { nombre, precio, fecha } = producto;
        const numero = String(indice + 1).padEnd(5);
        const productoNombre = nombre.padEnd(15).substring(0, 15);
        const productoPrecio = 'Gs. ' + String(precio);
        text += `${numero} ${fecha}    ${productoNombre}  ${productoPrecio.padStart(8)}\n`;
      });
    }

    text += '```';
    text += total !== null
      ? `\n*El total de la cuenta es: Gs. ${total}*`
      : 'No tienes cuenta pendiente';

    bot.sendMessage(userId, text, { parse_mode: 'Markdown' });
  } catch (error) {
    logger.error('Error en consultarCuenta: ' + error.message);
    bot.sendMessage(userId, '❌ Error al consultar tu cuenta. Intenta más tarde.');
  }
};

const pagarCuenta = async (msg, bot) => {
  const userId = msg.chat.id;
  try {
    await pagarCuentaDb(userId);
    bot.sendMessage(userId, 'El pago se ha realizado correctamente.');
  } catch (error) {
    logger.error('Error en pagarCuenta: ' + error.message);
    bot.sendMessage(userId, '❌ Error al registrar el pago. Intenta más tarde.');
  }
}

const busquedaPorRango = async (msg, bot) => {
  const chatId = msg.chat.id;
  await bot.sendMessage(
    chatId,
    '📅 La consulta por rango está en construcción. Usa /cuenta para ver tu saldo actual.'
  );
};

module.exports = {
  start,
  consultarCuenta,
  pagarCuenta,
  busquedaPorRango
};