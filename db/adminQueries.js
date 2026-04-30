const db = require('./connection');

const getPendingOrders = (callback) => {
    const query = `
        SELECT *
        FROM pedidos p
        LEFT JOIN clientes c ON p.cliente_id = c.telegram_id
        WHERE p.pagado = 0
    `;
    db.all(query, [], callback);
};

const getClientsWithDebt = (callback) => {
    const query = `
        SELECT c.*, IFNULL(SUM(CASE WHEN p.pagado = 0 THEN p.precio_pedido ELSE 0 END), 0) AS deuda_actual
        FROM clientes c
        LEFT JOIN pedidos p ON c.telegram_id = p.cliente_id
        GROUP BY c.telegram_id
    `;
    db.all(query, [], callback);
};

module.exports = {
    getPendingOrders,
    getClientsWithDebt
};
