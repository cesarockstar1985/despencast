const { google } = require('googleapis');
const logger = require('./utils/logger');

require('dotenv').config();

const { GOOGLE_JSON_CONTENT, SPREADSHEET_ID, SHEET_RANGE } = process.env
const RANGO = SHEET_RANGE || 'Hoja 1!A1:C67';

if (!SHEET_RANGE) {
  logger.warn('SHEET_RANGE no está configurada; usando rango por defecto: ' + RANGO);
}

if (!GOOGLE_JSON_CONTENT) {
  throw new Error('GOOGLE_JSON_CONTENT no está configurada');
}

if (!SPREADSHEET_ID) {
  throw new Error('SPREADSHEET_ID no está configurada');
}

let credentials;
try {
  credentials = JSON.parse(GOOGLE_JSON_CONTENT);
} catch (_error) {
  throw new Error('GOOGLE_JSON_CONTENT tiene formato JSON inválido');
}

const authCredentials = {
    credentials,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
};

 const spreadSheetValues = {
    spreadsheetId: SPREADSHEET_ID,
    range: RANGO,
}

const leerSheet = async (bot, msg, options = {}) => {
  const chatId = msg.chat.id;
  const { searchTerm } = options;

  logger.debug('Iniciando leerSheet...');
  try {

    const formattedRows = await sheetLookUp(options);

    logger.debug('Datos leídos correctamente.');

    const opciones = {
        reply_markup: {
            inline_keyboard: formattedRows
        }
    };

    if (formattedRows && formattedRows.length) {
      logger.debug('Enviando resultado a Telegram...');

      if (options.isBarcode && formattedRows.length === 1) {
        const btn = formattedRows[0][0];
        const [nombre, precio] = btn.text.split(': ');
        const mensaje = `📦 *Producto encontrado*\n\n*${nombre}*\nPrecio: ${precio}\n\n¿Agregar a tu cuenta?`;
        await bot.sendMessage(chatId, mensaje, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[
              { text: '✅ Confirmar', callback_data: btn.callback_data },
              { text: '❌ Cancelar', callback_data: 'cancelar_producto' }
            ]]
          }
        });
      } else {
        const mensaje = '🔔 **Productos** 🔔\n\n';
        await bot.sendMessage(chatId, mensaje, { parse_mode: 'Markdown', ...opciones });
      }

    } else {
      await bot.sendMessage(chatId, `No se encontró el producto ${searchTerm || ''}`);
      logger.debug('Sin resultados en el Sheet para: ' + (searchTerm || 'catálogo'));
    }
  } catch (error) {
    logger.error('Error en leerSheet: ' + error.message);
    try {
      await bot.sendMessage(chatId, '❌ Hubo un error al procesar la solicitud. Intenta más tarde.');
    } catch (telegramError) {
      console.error('Error al enviar la notificación de error:', telegramError.message);
    }
  }
}

const sheetLookUp = async (options = {}) => {
  try {

    // 1. AUTENTICACIÓN Y LECTURA DE GOOGLE SHEETS
    const auth = new google.auth.GoogleAuth(authCredentials);
    const sheets = google.sheets({ version: 'v4', auth });

    const { searchTerm, isBarcode } = options;

    logger.debug('Obteniendo datos del Sheet...');

    const { data } = await sheets.spreadsheets.values.get(spreadSheetValues);
    const rows = data.values;

    let productsToFormat = [];

    if (searchTerm) {
      const rowIndex = isBarcode ? 2 : 0;
      const found = rows.filter(row => {
          // Aseguramos que la columna exista antes de procesar
          if (!row[rowIndex]) return false;

          const produName = row[0];
          const targetValue = row[rowIndex].toString().toLowerCase();
          const search = searchTerm.toLowerCase();

          const matches = targetValue.includes(search);

          if (matches) {
              logger.debug(`Encontrado: ${produName} (vía ${searchTerm})`);
          }

          return matches;
      });

      // Ahora 'foundProducts' es un Array [] con todas las filas que coincidieron
      logger.debug(`Total de coincidencias: ${found.length}`);
      
      if (found) productsToFormat = found;
    } else {
      productsToFormat = rows;
    }

    if (!productsToFormat || productsToFormat.length === 0) return [];

    return formatRows(productsToFormat);

  } catch (error) {
    logger.error('Error en sheetLookUp: ' + error.message);
    return [];
  }
}

const formatRows = (rows) => {
  return rows.map(row => formatSingleRow(row));
};

const formatSingleRow = (row) => {
  const callbackText = row[0].toLowerCase().replace(/\s+/g, '_').replace(/'/g, '');
  const text = `${row[0]}: ${row[1]}`;
  const callback_data = 'insertar_producto_' + callbackText;

  return [{ text, callback_data }];
}

const writeBarcode = async (productNormalizedName, barcodeCode) => {
  const auth = new google.auth.GoogleAuth(authCredentials);
  const sheets = google.sheets({ version: 'v4', auth });

  const { data } = await sheets.spreadsheets.values.get(spreadSheetValues);
  const rows = data.values;

  const rowIndex = rows.findIndex(row => {
    if (!row[0]) return false;
    return row[0].toLowerCase().replace(/\s+/g, '_').replace(/'/g, '') === productNormalizedName;
  });

  if (rowIndex === -1) throw new Error('PRODUCT_NOT_FOUND');

  const sheetRowNumber = rowIndex + 1;
  const range = `Hoja 1!C${sheetRowNumber}`;

  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range,
    valueInputOption: 'RAW',
    requestBody: { values: [[barcodeCode]] },
  });
};

module.exports = {
  leerSheet,
  sheetLookUp,
  writeBarcode,
};