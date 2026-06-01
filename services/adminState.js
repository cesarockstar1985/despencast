// Stores barcode codes awaiting product assignment by admin (chatId → barcodeCode)
const pendingBarcodeAssignment = new Map();

module.exports = { pendingBarcodeAssignment };
