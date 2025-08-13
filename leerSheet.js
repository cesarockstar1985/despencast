const { google } = require('googleapis');

require('dotenv').config();

const { CREDENTIALS_PATH, SPREADSHEET_ID, CHAT_ID } = process.env
const RANGO = 'Hoja 1!A1:B57';

const authCredentials = {
    keyFile: CREDENTIALS_PATH,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
};

 const spreadSheetValues = {
    spreadsheetId: SPREADSHEET_ID,
    range: RANGO,
}

const leerSheet = async (bot, searchTerm = '') => {
  console.log('Iniciando proceso...');
  try {

    const formattedRows = await sheetLookUp(searchTerm)

    console.log('Datos leídos correctamente.');

    const opciones = {
        reply_markup: {
            inline_keyboard: formattedRows
        }
    };

    if (formattedRows && formattedRows.length) {
      // Formatea los datos para el mensaje
      let mensaje = '🔔 **Productos** 🔔\n\n';

      console.log('Enviando notificación a Telegram...');
     
      await bot.sendMessage(CHAT_ID, mensaje, { parse_mode: 'Markdown', ...opciones });
      
    } else {
      console.log('No se encontraron datos en el Sheet.');
    }
  } catch (error) {
    console.error('Hubo un error en el proceso:', error.message);
    // Opcional: Notificar el error por Telegram
    try {
      await bot.sendMessage(CHAT_ID, `❌ Hubo un error en el bot: ${error.message}`);
    } catch (telegramError) {
      console.error('Error al enviar la notificación de error:', telegramError.message);
    }
  }
}

const sheetLookUp = async (searchTerm = '') => {
  try {

    // 1. AUTENTICACIÓN Y LECTURA DE GOOGLE SHEETS
    const auth = new google.auth.GoogleAuth(authCredentials);
    const sheets = google.sheets({ version: 'v4', auth });

    console.log('Obteniendo datos del Sheet...');

    const { data } = await sheets.spreadsheets.values.get(spreadSheetValues);
    const rows = data.values;

    let formattedRows = await formatRows(rows)

    if(searchTerm !== '') {
      formattedRows = formattedRows.filter(row => {
        return row[0].text.toLowerCase().includes(searchTerm.toLowerCase())
      })
    }

    return formattedRows

  }catch (error) {
    console.error('Hubo un error en el proceso:', error.message);
  }
}

const formatRows = async (rows) => {
  const formattedRows = rows.map(row => {
    let callbackText = row[0].toLowerCase().replace(/\s+/g, '_');
    callbackText = callbackText.replace('\'', '');
    const text = `${row[0]}: ${row[1]}`;
    const callback_data = 'insertar_producto_' + callbackText;

    return [{ text, callback_data }]
  });

  return formattedRows;
}

module.exports = {
  leerSheet,
  sheetLookUp
};