// middlewares/authMiddleware.js
module.exports = (req, res, next) => {
    // Verificamos si existe la sesión del usuario
    if (req.session && req.session.adminId) {
        return next(); // Está logueado, puede pasar
    } else {
        res.redirect('/login'); // No está logueado, afuera
    }
};