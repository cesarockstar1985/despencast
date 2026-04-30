// index.js
require('dotenv').config();

const crypto = require('crypto');
const express = require('express');
const session = require('express-session');
require('./bot');
const webRoutes = require('./routes/web');
const path = require('path');

const app = express();

// ... Configuración de Vistas (EJS) ...
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares de parseo (Ya los tenías, van antes de la sesión)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET;

if (isProduction && !sessionSecret) {
    throw new Error('SESSION_SECRET is required in production');
}

const effectiveSessionSecret =
    sessionSecret || crypto.randomBytes(32).toString('hex');

if (!sessionSecret) {
    console.warn('SESSION_SECRET is not set; using ephemeral secret for this process');
}

// 3. Configuración de express-session
app.use(session({
    secret: effectiveSessionSecret,
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60 * 24,
        secure: isProduction,
        httpOnly: true,
        sameSite: 'lax'
    }
}));

// 4. Tus rutas (Ahora ya pueden usar req.session)
app.use('/', webRoutes);

const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Sistema Híbrido Iniciado`);
    console.log(`🌐 Dashboard: Puerto ${PORT}`);
    console.log(`🤖 Bot de Telegram: Activo y escuchando`);
});