const Client = require('../models/Client');

const registrarCliente  = async (telegramId, name) => {
    if(telegramId == undefined || name == undefined){
        throw new Error("Faltan datos");
    }

    const client = await Client.getByTelegramId(telegramId);

    if(client){
        throw new Error("El cliente ya existe");
    }

    const clientByName = await Client.getByName(name);

    if(clientByName){
        throw new Error("Un cliente con ese nombre ya existe. Desea asignar el id a este usuario");
    }

    await Client.create({
        telegram_id: telegramId,
        nombre: name,
        alias: name,
        limite: 0
    });
};


module.exports = { registrarCliente };