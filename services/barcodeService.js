const { Jimp } = require('jimp');
const {
    MultiFormatReader,
    BarcodeFormat,
    DecodeHintType,
    RGBLuminanceSource,
    BinaryBitmap,
    HybridBinarizer,
    GlobalHistogramBinarizer
} = require('@zxing/library');

const HINTS = new Map([
    [DecodeHintType.POSSIBLE_FORMATS, [
        BarcodeFormat.EAN_13, BarcodeFormat.EAN_8,
        BarcodeFormat.CODE_128, BarcodeFormat.UPC_A,
        BarcodeFormat.QR_CODE, BarcodeFormat.ITF,
        BarcodeFormat.CODE_39,
    ]],
    [DecodeHintType.TRY_HARDER, true],
]);

// ITU-R BT.709 — fórmula estándar de luminancia perceptual
const extractLuma = (image) => {
    const { width, height, data } = image.bitmap;
    const luma = new Uint8ClampedArray(width * height);
    for (let i = 0; i < data.length; i += 4) {
        luma[i / 4] = 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
    }
    return new RGBLuminanceSource(luma, width, height);
};

const tryDecode = (image, reader) => {
    const source = extractLuma(image);
    const candidates = [
        new HybridBinarizer(source),
        new GlobalHistogramBinarizer(source),
        new HybridBinarizer(source.invert()),
        new GlobalHistogramBinarizer(source.invert()),
    ];

    for (const binarizer of candidates) {
        try {
            return reader.decode(new BinaryBitmap(binarizer), HINTS).getText();
        } catch (_) {}
    }
    return null;
};

const decodeBarcode = async (imageBuffer) => {
    const original = await Jimp.read(imageBuffer);
    const reader = new MultiFormatReader();

    const configs = [
        { width: 800,  rotation: 0   },
        { width: 1200, rotation: 0   },
        { width: 600,  rotation: 0   },
        { width: 800,  rotation: 90  },
        { width: 800,  rotation: 180 },
        { width: 800,  rotation: 270 },
        { width: 1200, rotation: 90  },
        { width: 1200, rotation: 270 },
    ];

    for (const { width, rotation } of configs) {
        const img = original.clone();
        img.resize({ w: width });
        if (rotation) img.rotate(rotation);
        img.greyscale();
        img.convolute([[0, -1, 0], [-1, 5, -1], [0, -1, 0]]);
        img.contrast(0.6);
        img.normalize();

        const result = tryDecode(img, reader);
        if (result) return result;
    }

    throw new Error('NOT_FOUND');
};

module.exports = { decodeBarcode };
