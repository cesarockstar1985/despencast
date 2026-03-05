// seed-admin.js
const db = require('./db/connection');
const bcrypt = require('bcrypt');

const saltRounds = 10; // Nivel de seguridad
const passwordPlana = 'Revolber01'; // La clave que vas a usar para entrar

bcrypt.hash(passwordPlana, saltRounds, (err, hash) => {
    if (err) return console.error(err);

    db.run(`INSERT INTO admin_users (username, password) VALUES (?, ?)`, 
    ['admin', hash], (err) => {
        if (err) return console.error("❌ Error:", err.message);
        console.log("✅ Admin creado con HASH de seguridad");
        process.exit(0);
    });
});