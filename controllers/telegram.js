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
    
      // ¡Aquí sí tienes acceso a las filas!
      const total = filas[0].total;
      let text = '';

      if (total != null){
        text = `El total de la cuenta es: Gs. ${total}`
      }
      if(total == null){
        text = 'No tienes cuenta pendiente';
      }

      bot.sendMessage(userId, text)
    });
}

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