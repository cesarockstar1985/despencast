const { consultarCuentaDb, pagarCuentaDb } = require('../db/setup-db');

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
          { text: '📦 Cuenta', callback_data: 'estado_cuenta' }
        ]
      ]
    }
  };

  // Enviar el mensaje con el teclado inline
  bot.sendMessage(chatId, texto, opciones);
};

const consultarCuenta = (msg, bot, dateObject = {}) => {
  const userId = msg.chat.id;
  consultarCuentaDb(userId, dateObject, (error, filas) => {
    if (error) {
      console.error("Hubo un error:", error.message);
      return;
    }

    const { total, productos } = filas;
    let text = '*Detalle de cuenta*\n\n';

    // Encabezados de la grilla
    text += '```\n';
    text += 'Nro.  Producto         Precio\n';
    text += '------------------------------\n';

    if (productos.length > 0) {
      productos.forEach((producto, indice) => {
        const { nombre, precio } = producto;
        
        // Formato para la fila de la grilla
        const numero = String(indice + 1).padEnd(5);
        const productoNombre = nombre.padEnd(15).substring(0, 15);
        const productoPrecio = 'Gs. ' + String(precio);

        text += `${numero}${productoNombre} ${productoPrecio.padStart(8)}\n`;
      });
    }

    text += '```';

    if (total !== null) {
      text += `\n*El total de la cuenta es: Gs. ${total}*`;
    } else {
      text += 'No tienes cuenta pendiente';
    }

    bot.sendMessage(userId, text, { parse_mode: 'Markdown' });
  });
};

const pagarCuenta = async (msg, bot) => {
  const userId = msg.chat.id;

  pagarCuentaDb(userId, (error, result) => {
    if(error)
    {
        console.error("Hubo un error:", error.message);
        return;
    }

    bot.sendMessage(userId, 'El pago se ha realizado correctamente.')
  });
}

module.exports = {
  start,
  consultarCuenta,
  pagarCuenta
};