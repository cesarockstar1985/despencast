// index.js
const express = require('express');
const bot = require('./bot');
const webRoutes = require('./routes/web');

const app = express();

// ... resto de la configuración de Express ...
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/', webRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Sistema Híbrido Iniciado`);
    console.log(`🌐 Dashboard: Puerto ${PORT}`);
    console.log(`🤖 Bot de Telegram: Activo y escuchando`);
});