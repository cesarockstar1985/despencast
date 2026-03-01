const { leerSheet } = require('../leerSheet');
const { consultarCuenta, pagarCuenta } = require('./telegram');

const botActions = {

    // Comandos del bot
    menuConfig: [
        { command: 'start', description: 'Menú principal' },
        { command: 'barcode', description: 'Escanear código de barras' },
        { command: 'catalogo', description: 'Ver el catálogo de productos' },
        { command: 'buscar', description: 'Buscar producto por nombre' },
        { command: 'cuenta', description: 'Verificar cuenta' },
        { command: 'pagar', description: 'Marcar deuda como pagada' },
    ],

    // Comando /start
    handleStart: (bot, msg) => {
        const chatId = msg.chat.id;
        const message = "👋 ¡Hola! Soy el sistema de gestión de DespenCast.\n\n" +
                        "Usa el menú de comandos o los botones para navegar.";
        // Comandos del bot
        bot.setMyCommands(Actions.menuConfig);
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
    },

    handleCallback: async (bot, query) => {
        const msg = query.message;
        const data = query.data;
        const chatId = msg.chat.id;

        bot.answerCallbackQuery(query.id);

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
    }
};

module.exports = botActions;