const test = require('node:test');
const assert = require('node:assert/strict');

const { busquedaPorRango } = require('../controllers/telegram');

test('busquedaPorRango responde mensaje de funcionalidad en construccion', async () => {
    const msg = { chat: { id: 999 } };
    let chatIdReceived;
    let messageReceived;
    const bot = {
        async sendMessage(chatId, message) {
            chatIdReceived = chatId;
            messageReceived = message;
        }
    };

    await busquedaPorRango(msg, bot);

    assert.equal(chatIdReceived, 999);
    assert.match(messageReceived, /en construcción/i);
});
