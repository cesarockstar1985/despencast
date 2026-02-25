// index.js
const express = require('express');
const bot = require('./telegramBot'); // <-- Esto ya enciende el bot al ejecutarse
const webRoutes = require('./routes/web');

const app = express();

// ... resto de la configuración de Express ...

app.use('/', webRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema Híbrido Iniciado`);
    console.log(`🌐 Dashboard: Puerto ${PORT}`);
    console.log(`🤖 Bot de Telegram: Activo y escuchando`);
});