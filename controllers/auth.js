const Admin = require('../models/Admin');
const bcrypt = require('bcrypt'); // 1. Importamos la librería

exports.showLogin = (req, res) => {
    res.render('login', { error: null });
};

exports.processLogin = async (req, res) => {
    const { username, password } = req.body;
    
    try {
        const user = await Admin.getByUsername(username);
        
        // 2. Si el usuario existe, comparamos el HASH
        if (user) {
            const match = await bcrypt.compare(password, user.password);
            
            if (match) {
                // Login exitoso
                req.session.adminId = user.id;
                req.session.username = user.username;
                return res.redirect('/');
            }
        }

        // 3. Si no existe o la clave no coincide, error genérico por seguridad
        res.render('login', { error: 'Usuario o contraseña incorrectos' });

    } catch (error) {
        console.error("Error en el login:", error);
        res.status(500).send("Error interno en el servidor");
    }
};

exports.logout = (req, res) => {
    req.session.destroy((err) => {
        if (err) console.error("Error al cerrar sesión:", err);
        res.clearCookie('connect.sid'); // Limpiamos la cookie del navegador
        res.redirect('/login');
    });
};