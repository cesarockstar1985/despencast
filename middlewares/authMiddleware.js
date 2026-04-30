// middlewares/authMiddleware.js
module.exports = (req, res, next) => {
    // Verificamos si existe la sesión del usuario
    if (req.session && req.session.adminId) {
        return next(); // Está logueado, puede pasar
    }

    const acceptsJson = req.xhr || (req.headers.accept || '').includes('application/json');
    if (acceptsJson) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    res.redirect('/login'); // No está logueado, afuera
};