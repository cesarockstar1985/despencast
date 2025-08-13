const start = (msg, bot) => {
  const chatId = msg.chat.id;
  const texto = 'Hola 👋. Soy tu asistente de pedidos. ¿Qué te gustaría hacer?';

  // Opciones del teclado inline
  const opciones = {
    reply_markup: {
      inline_keyboard: [
        [
          // Cada objeto es un botón. `text` es lo que ve el usuario, `callback_data` es lo que recibes tú.
          { text: '🍕 Ver Productos', callback_data: 'productos_precios' },
          { text: '📦 Cuenta', callback_data: 'estado_pedido' }
        ]
      ]
    }
  };

  // Enviar el mensaje con el teclado inline
  bot.sendMessage(chatId, texto, opciones);
};

module.exports = start;