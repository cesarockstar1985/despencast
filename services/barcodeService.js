const { Jimp } = require('jimp'); // Asegúrate de tener la v1.x o superior
const { 
    MultiFormatReader, 
    BarcodeFormat, 
    DecodeHintType, 
    RGBLuminanceSource, 
    BinaryBitmap, 
    HybridBinarizer,
    GlobalHistogramBinarizer 
} = require('@zxing/library');

const decodeBarcode = async (imageBuffer) => {
    const image = await Jimp.read(imageBuffer);        
    image.resize({ w: 800 }); // Tamaño ideal para balancear velocidad/detalle
    image.greyscale();
    image.contrast(0.8);
    image.normalize();

    // 3. Preparar datos para ZXing (Extracción manual de luminancia)
    const width = image.bitmap.width;
    const height = image.bitmap.height;
    const data = image.bitmap.data;
    const lumaBuffer = new Uint8ClampedArray(width * height);

    for (let i = 0; i < data.length; i += 4) {
        // Fórmula de luminancia: (R+G+B)/3
        lumaBuffer[i / 4] = (data[i] + data[i + 1] + data[i + 2]) / 3;
    }

    const luminanceSource = new RGBLuminanceSource(lumaBuffer, width, height);
    const hints = new Map();
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, 
        BarcodeFormat.CODE_128, BarcodeFormat.UPC_A, BarcodeFormat.QR_CODE
    ]);
    hints.set(DecodeHintType.TRY_HARDER, true);
    
    const reader = new MultiFormatReader();
    const attempts = [
        { binarizer: HybridBinarizer, invert: false },
        { binarizer: GlobalHistogramBinarizer, invert: false },
        { binarizer: HybridBinarizer, invert: true }
    ];

    for (const config of attempts) {
        try {
            if (config.invert) luminanceSource.invert();
            const bitmap = new BinaryBitmap(new config.binarizer(luminanceSource));
            return reader.decode(bitmap, hints).getText();
        } catch (e) { /* continuar al siguiente intento */ }
    }
    throw new Error('NOT_FOUND');
}

module.exports = {
    decodeBarcode
};