const { leerSheet } = require('../leerSheet');
const { consultarCuenta, pagarCuenta } = require('./telegram');

const botActions = {
    // Comando /start
    handleStart: (bot, msg) => {
        const chatId = msg.chat.id;
        const message = "👋 ¡Hola! Soy el sistema de gestión de DespenCast.\n\n" +
                        "Usa el menú de comandos o los botones para navegar.";
        bot.sendMessage(chatId, message);
    },

    // Comando /barcode
    handleBarcodeRequest: (bot, msg, waitingForBarcode) => {
        const chatId = msg.chat.id;
        waitingForBarcode.add(chatId);
        bot.sendMessage(chatId, '📸 Envíame una foto clara del código de barras.');
    },

    // Comando /buscar
    handleSearch: (bot, msg, match) => {
        const searchTerm = match[1];
        leerSheet(bot, msg, { searchTerm, isBarcode: false });
    },

    // Manejo de errores genéricos
    sendError: (bot, chatId, type) => {
        const errors = {
            auth: `⚠️ Acceso denegado. Tu usuario no está registrado. Pide al administrador que te registre con este codigo \`${chatId}\``,
            tech: "❌ Error técnico. Por favor, intenta más tarde.",
            image: "❌ No se pudo detectar el código. Intenta con más luz."
        };
        bot.sendMessage(chatId, errors[type] || "Hubo un problema.", { parse_mode: 'Markdown'  });
    }
};

module.exports = botActions;