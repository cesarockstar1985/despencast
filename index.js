// index.js
const express = require('express');
const session = require('express-session'); // 1. Importar el paquete
const bot = require('./bot');
const webRoutes = require('./routes/web');
const path = require('path');

const app = express();

// ... Configuración de Vistas (EJS) ...
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 2. Middlewares de parseo (Ya los tenías, van antes de la sesión)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 3. Configuración de express-session
app.use(session({
    secret: 'clave-secreta-despencast', // Una frase única para encriptar la cookie
    resave: false,                  // No guarda la sesión si no hubo cambios
    saveUninitialized: false,       // No crea una sesión hasta que guardes algo
    cookie: { 
        maxAge: 1000 * 60 * 60 * 24, // La sesión durará 24 horas
        secure: false                // Poner en true solo si usas HTTPS (Railway lo da, pero para test local mejor false)
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