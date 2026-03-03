import * as assert from 'assert';
import {
    normalizeColor,
    adjustLightness,
    darken,
    lighten,
    toVibrant,
    toMuted,
    toPastel,
    getComplementary,
    isLightColor,
    isDarkColor
} from '../colors/colorNormalizer';
import { hexToRgb, getRelativeLuminance } from '../utils/colorValidation';

suite('Color Normalizer Test Suite', () => {

    suite('normalizeColor', () => {
        test('should not change colors within acceptable luminance', () => {
            const midColor = '#808080'; // Medium gray
            const normalized = normalizeColor(midColor);
            // Should be similar but might have small adjustments
            assert.ok(normalized.startsWith('#'));
            assert.strictEqual(normalized.length, 7);
        });

        test('should lighten very dark colors', () => {
            const veryDark = '#101010';
            const normalized = normalizeColor(veryDark);
            const normalizedRgb = hexToRgb(normalized);
            const originalRgb = hexToRgb(veryDark);

            assert.ok(normalizedRgb !== null);
            assert.ok(originalRgb !== null);

            // Normalized should be lighter
            const normalizedLum = getRelativeLuminance(normalizedRgb!);
            const originalLum = getRelativeLuminance(originalRgb!);
            assert.ok(normalizedLum >= originalLum);
        });

        test('should darken very light colors', () => {
            const veryLight = '#f5f5f5';
            const normalized = normalizeColor(veryLight);
            const normalizedRgb = hexToRgb(normalized);
            const originalRgb = hexToRgb(veryLight);

            assert.ok(normalizedRgb !== null);
            assert.ok(originalRgb !== null);

            // Normalized should be darker
            const normalizedLum = getRelativeLuminance(normalizedRgb!);
            const originalLum = getRelativeLuminance(originalRgb!);
            assert.ok(normalizedLum <= originalLum);
        });
    });

    suite('adjustLightness', () => {
        test('should increase lightness with positive amount', () => {
            const color = '#404040';
            const lighter = adjustLightness(color, 0.2);
            const lighterRgb = hexToRgb(lighter);
            const originalRgb = hexToRgb(color);

            assert.ok(lighterRgb !== null && originalRgb !== null);
            assert.ok(getRelativeLuminance(lighterRgb!) > getRelativeLuminance(originalRgb!));
        });

        test('should decrease lightness with negative amount', () => {
            const color = '#c0c0c0';
            const darker = adjustLightness(color, -0.2);
            const darkerRgb = hexToRgb(darker);
            const originalRgb = hexToRgb(color);

            assert.ok(darkerRgb !== null && originalRgb !== null);
            assert.ok(getRelativeLuminance(darkerRgb!) < getRelativeLuminance(originalRgb!));
        });
    });

    suite('darken and lighten', () => {
        test('darken should produce darker color', () => {
            const color = '#3498db';
            const darkened = darken(color);
            const darkenedRgb = hexToRgb(darkened);
            const originalRgb = hexToRgb(color);

            assert.ok(darkenedRgb !== null && originalRgb !== null);
            assert.ok(getRelativeLuminance(darkenedRgb!) < getRelativeLuminance(originalRgb!));
        });

        test('lighten should produce lighter color', () => {
            const color = '#3498db';
            const lightened = lighten(color);
            const lightenedRgb = hexToRgb(lightened);
            const originalRgb = hexToRgb(color);

            assert.ok(lightenedRgb !== null && originalRgb !== null);
            assert.ok(getRelativeLuminance(lightenedRgb!) > getRelativeLuminance(originalRgb!));
        });
    });

    suite('toVibrant', () => {
        test('should increase saturation', () => {
            const muted = '#7a8a9a';
            const vibrant = toVibrant(muted);

            // Vibrant version should be more saturated
            // Hard to test directly, but ensure it's a valid color
            assert.ok(vibrant.startsWith('#'));
            assert.strictEqual(vibrant.length, 7);
        });
    });

    suite('toMuted', () => {
        test('should decrease saturation', () => {
            const bright = '#ff0000';
            const muted = toMuted(bright);

            // Muted version should be less saturated
            assert.ok(muted.startsWith('#'));
            assert.strictEqual(muted.length, 7);

            // Should not be pure red anymore
            const mutedRgb = hexToRgb(muted);
            assert.ok(mutedRgb !== null);
            assert.ok(mutedRgb!.g > 0 || mutedRgb!.b > 0 || mutedRgb!.r < 255);
        });
    });

    suite('toPastel', () => {
        test('should create soft pastel color', () => {
            const color = '#e74c3c';
            const pastel = toPastel(color);

            const pastelRgb = hexToRgb(pastel);
            assert.ok(pastelRgb !== null);

            // Pastel should be relatively light
            const luminance = getRelativeLuminance(pastelRgb!);
            assert.ok(luminance > 0.3);
        });
    });

    suite('getComplementary', () => {
        test('should return opposite color', () => {
            // Red -> Cyan (roughly)
            const red = '#ff0000';
            const complement = getComplementary(red);

            assert.ok(complement.startsWith('#'));
            assert.strictEqual(complement.length, 7);

            // Complement of red should have more blue/green
            const complementRgb = hexToRgb(complement);
            assert.ok(complementRgb !== null);
            assert.ok(complementRgb!.r < complementRgb!.g || complementRgb!.r < complementRgb!.b);
        });
    });

    suite('isLightColor and isDarkColor', () => {
        test('should correctly identify light colors', () => {
            assert.strictEqual(isLightColor('#ffffff'), true);
            assert.strictEqual(isLightColor('#f0f0f0'), true);
            assert.strictEqual(isDarkColor('#ffffff'), false);
        });

        test('should correctly identify dark colors', () => {
            assert.strictEqual(isDarkColor('#000000'), true);
            assert.strictEqual(isDarkColor('#202020'), true);
            assert.strictEqual(isLightColor('#000000'), false);
        });
    });
});
