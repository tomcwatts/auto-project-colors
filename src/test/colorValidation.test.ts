import * as assert from 'assert';
import {
    isValidHexColor,
    normalizeHexColor,
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    getRelativeLuminance,
    getContrastRatio,
    getOptimalTextColor,
    getContrastingForeground
} from '../utils/colorValidation';

suite('Color Validation Test Suite', () => {

    suite('isValidHexColor', () => {
        test('should accept valid 6-char hex colors', () => {
            assert.strictEqual(isValidHexColor('#ff0000'), true);
            assert.strictEqual(isValidHexColor('#00FF00'), true);
            assert.strictEqual(isValidHexColor('#0000ff'), true);
            assert.strictEqual(isValidHexColor('#123456'), true);
            assert.strictEqual(isValidHexColor('#ABCDEF'), true);
        });

        test('should accept valid 3-char hex colors', () => {
            assert.strictEqual(isValidHexColor('#f00'), true);
            assert.strictEqual(isValidHexColor('#0F0'), true);
            assert.strictEqual(isValidHexColor('#00f'), true);
        });

        test('should accept valid 8-char hex colors (with alpha)', () => {
            assert.strictEqual(isValidHexColor('#ff0000ff'), true);
            assert.strictEqual(isValidHexColor('#00FF00AA'), true);
        });

        test('should reject invalid hex colors', () => {
            assert.strictEqual(isValidHexColor('ff0000'), false); // No hash
            assert.strictEqual(isValidHexColor('#ff00'), false); // Wrong length
            assert.strictEqual(isValidHexColor('#gg0000'), false); // Invalid char
            assert.strictEqual(isValidHexColor(''), false);
            assert.strictEqual(isValidHexColor('#'), false);
        });
    });

    suite('normalizeHexColor', () => {
        test('should normalize 3-char to 6-char', () => {
            assert.strictEqual(normalizeHexColor('#f00'), '#ff0000');
            assert.strictEqual(normalizeHexColor('#0F0'), '#00ff00');
            assert.strictEqual(normalizeHexColor('#00f'), '#0000ff');
        });

        test('should strip alpha channel', () => {
            assert.strictEqual(normalizeHexColor('#ff0000ff'), '#ff0000');
            assert.strictEqual(normalizeHexColor('#00FF00AA'), '#00ff00');
        });

        test('should lowercase hex colors', () => {
            assert.strictEqual(normalizeHexColor('#FF0000'), '#ff0000');
            assert.strictEqual(normalizeHexColor('#ABCDEF'), '#abcdef');
        });

        test('should return null for invalid colors', () => {
            assert.strictEqual(normalizeHexColor('invalid'), null);
            assert.strictEqual(normalizeHexColor('#gg0000'), null);
        });
    });

    suite('hexToRgb', () => {
        test('should convert hex to RGB', () => {
            const red = hexToRgb('#ff0000');
            assert.deepStrictEqual(red, { r: 255, g: 0, b: 0 });

            const green = hexToRgb('#00ff00');
            assert.deepStrictEqual(green, { r: 0, g: 255, b: 0 });

            const blue = hexToRgb('#0000ff');
            assert.deepStrictEqual(blue, { r: 0, g: 0, b: 255 });

            const white = hexToRgb('#ffffff');
            assert.deepStrictEqual(white, { r: 255, g: 255, b: 255 });

            const black = hexToRgb('#000000');
            assert.deepStrictEqual(black, { r: 0, g: 0, b: 0 });
        });

        test('should handle 3-char hex', () => {
            const red = hexToRgb('#f00');
            assert.deepStrictEqual(red, { r: 255, g: 0, b: 0 });
        });

        test('should return null for invalid hex', () => {
            assert.strictEqual(hexToRgb('invalid'), null);
        });
    });

    suite('rgbToHex', () => {
        test('should convert RGB to hex', () => {
            assert.strictEqual(rgbToHex({ r: 255, g: 0, b: 0 }), '#ff0000');
            assert.strictEqual(rgbToHex({ r: 0, g: 255, b: 0 }), '#00ff00');
            assert.strictEqual(rgbToHex({ r: 0, g: 0, b: 255 }), '#0000ff');
        });

        test('should clamp values to 0-255', () => {
            assert.strictEqual(rgbToHex({ r: 300, g: -10, b: 128 }), '#ff0080');
        });
    });

    suite('RGB/HSL conversions', () => {
        test('should round-trip RGB -> HSL -> RGB', () => {
            const original = { r: 128, g: 64, b: 192 };
            const hsl = rgbToHsl(original);
            const roundTrip = hslToRgb(hsl);

            // Allow for small rounding differences
            assert.ok(Math.abs(original.r - roundTrip.r) <= 1);
            assert.ok(Math.abs(original.g - roundTrip.g) <= 1);
            assert.ok(Math.abs(original.b - roundTrip.b) <= 1);
        });

        test('should handle grayscale colors', () => {
            const gray = { r: 128, g: 128, b: 128 };
            const hsl = rgbToHsl(gray);
            assert.strictEqual(hsl.s, 0); // No saturation for gray

            const roundTrip = hslToRgb(hsl);
            assert.strictEqual(roundTrip.r, 128);
            assert.strictEqual(roundTrip.g, 128);
            assert.strictEqual(roundTrip.b, 128);
        });
    });

    suite('getRelativeLuminance', () => {
        test('should return correct luminance values', () => {
            const whiteLum = getRelativeLuminance({ r: 255, g: 255, b: 255 });
            assert.ok(whiteLum > 0.99);

            const blackLum = getRelativeLuminance({ r: 0, g: 0, b: 0 });
            assert.strictEqual(blackLum, 0);

            // Middle gray should be around 0.2
            const grayLum = getRelativeLuminance({ r: 128, g: 128, b: 128 });
            assert.ok(grayLum > 0.1 && grayLum < 0.3);
        });
    });

    suite('getContrastRatio', () => {
        test('should return correct contrast ratios', () => {
            const white = { r: 255, g: 255, b: 255 };
            const black = { r: 0, g: 0, b: 0 };

            const ratio = getContrastRatio(white, black);
            assert.ok(ratio > 20); // Black/white contrast is ~21:1
        });

        test('should return 1 for same colors', () => {
            const color = { r: 128, g: 128, b: 128 };
            const ratio = getContrastRatio(color, color);
            assert.strictEqual(ratio, 1);
        });
    });

    suite('getOptimalTextColor', () => {
        test('should return white for dark backgrounds', () => {
            assert.strictEqual(getOptimalTextColor({ r: 0, g: 0, b: 0 }), '#ffffff');
            assert.strictEqual(getOptimalTextColor({ r: 50, g: 50, b: 50 }), '#ffffff');
        });

        test('should return black for light backgrounds', () => {
            assert.strictEqual(getOptimalTextColor({ r: 255, g: 255, b: 255 }), '#000000');
            assert.strictEqual(getOptimalTextColor({ r: 200, g: 200, b: 200 }), '#000000');
        });
    });

    suite('getContrastingForeground', () => {
        test('should return white or black based on contrast', () => {
            // Very dark background should get white text
            const darkBg = { r: 30, g: 30, b: 30 };
            assert.strictEqual(getContrastingForeground(darkBg, 4.5), '#ffffff');

            // Very light background should get black text
            const lightBg = { r: 240, g: 240, b: 240 };
            assert.strictEqual(getContrastingForeground(lightBg, 4.5), '#000000');
        });
    });
});
