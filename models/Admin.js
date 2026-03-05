const db = require('../db/connection');

const Admin = {
    getByUsername: (username) => {
        return new Promise((resolve, reject) => {
            db.get("SELECT * FROM admin_users WHERE username = ?", [username], (err, row) => {
                if (err) reject(err);
                resolve(row);
            });
        });
    }
};

module.exports = Admin;