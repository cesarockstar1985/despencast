const Client = require('../models/Client');

const registrarCliente  = async (clientDataObj) => {
    const { telegramId, name, update } = clientDataObj;

    if (!telegramId || !name) {
        throw new Error("Faltan datos");
    }

    if (!/^\d+$/.test(String(telegramId))) {
        throw new Error("El ID de Telegram debe ser numérico");
    }

    if (typeof name !== 'string' || name.trim().length === 0 || name.trim().length > 100) {
        throw new Error("El nombre debe tener entre 1 y 100 caracteres");
    }

    const client = await Client.getByTelegramId(telegramId);

    if(client){
        throw new Error("El cliente ya existe");
    }

    const clientByName = await Client.getByName(name);

    if(clientByName && !update){
        throw new Error("Un cliente con ese nombre ya existe. Desea asignar el id a este usuario");
    }

    if(update){
        await Client.updateByName({
            telegram_id: telegramId,
            nombre: name
        });    
    }

    if(!update){
        await Client.create({
            telegram_id: telegramId,
            nombre: name,
            alias: name,
            limite: 0
        });
    }
};


module.exports = { registrarCliente };