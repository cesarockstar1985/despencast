// seed-admin.js
require('dotenv').config();

const db = require('./db/connection');
const bcrypt = require('bcrypt');

const saltRounds = 10; // Nivel de seguridad
const username = process.env.ADMIN_USERNAME || 'admin';
const passwordPlana = process.env.ADMIN_PASSWORD;

if (!passwordPlana) {
    console.error('❌ ADMIN_PASSWORD no está configurada en variables de entorno');
    process.exit(1);
}

bcrypt.hash(passwordPlana, saltRounds, (err, hash) => {
    if (err) return console.error(err);

    db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, 
    [username, hash], (err) => {
        if (err) return console.error("❌ Error:", err.message);
        console.log("✅ Admin creado con HASH de seguridad");
        process.exit(0);
    });
});