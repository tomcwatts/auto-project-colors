import * as assert from 'assert';
import { generatePalette, generateSimplePalette } from '../colors/colorGenerator';
import { isValidHexColor, hexToRgb, getContrastRatio } from '../utils/colorValidation';

suite('Color Generator Test Suite', () => {

    suite('generatePalette', () => {
        const testColor = '#3498db';
        const contrastTarget = 4.5;

        test('should generate valid palette with dominant strategy', () => {
            const palette = generatePalette(testColor, 'dominant', contrastTarget);

            assert.ok(isValidHexColor(palette.primary));
            assert.ok(isValidHexColor(palette.primaryForeground));
            assert.ok(isValidHexColor(palette.darkened));
            assert.ok(isValidHexColor(palette.darkenedForeground));
            assert.ok(isValidHexColor(palette.lightened));
            assert.ok(isValidHexColor(palette.lightenedForeground));
            assert.ok(isValidHexColor(palette.accent));
            assert.ok(isValidHexColor(palette.accentForeground));
        });

        test('should generate valid palette with vibrant strategy', () => {
            const palette = generatePalette(testColor, 'vibrant', contrastTarget);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('should generate valid palette with muted strategy', () => {
            const palette = generatePalette(testColor, 'muted', contrastTarget);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('should generate valid palette with pastel strategy', () => {
            const palette = generatePalette(testColor, 'pastel', contrastTarget);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('darkened should be darker than primary', () => {
            const palette = generatePalette(testColor, 'dominant', contrastTarget);

            const primaryRgb = hexToRgb(palette.primary);
            const darkenedRgb = hexToRgb(palette.darkened);

            assert.ok(primaryRgb !== null && darkenedRgb !== null);

            // Calculate average brightness
            const primaryBrightness = (primaryRgb!.r + primaryRgb!.g + primaryRgb!.b) / 3;
            const darkenedBrightness = (darkenedRgb!.r + darkenedRgb!.g + darkenedRgb!.b) / 3;

            assert.ok(darkenedBrightness <= primaryBrightness);
        });

        test('lightened should be lighter than primary', () => {
            const palette = generatePalette(testColor, 'dominant', contrastTarget);

            const primaryRgb = hexToRgb(palette.primary);
            const lightenedRgb = hexToRgb(palette.lightened);

            assert.ok(primaryRgb !== null && lightenedRgb !== null);

            // Calculate average brightness
            const primaryBrightness = (primaryRgb!.r + primaryRgb!.g + primaryRgb!.b) / 3;
            const lightenedBrightness = (lightenedRgb!.r + lightenedRgb!.g + lightenedRgb!.b) / 3;

            assert.ok(lightenedBrightness >= primaryBrightness);
        });

        test('foreground colors should provide reasonable contrast', () => {
            const palette = generatePalette(testColor, 'dominant', contrastTarget);

            const primaryRgb = hexToRgb(palette.primary);
            const foregroundRgb = hexToRgb(palette.primaryForeground);

            assert.ok(primaryRgb !== null && foregroundRgb !== null);

            const contrast = getContrastRatio(primaryRgb!, foregroundRgb!);
            // Should have at least some contrast
            assert.ok(contrast > 2);
        });
    });

    suite('generateSimplePalette', () => {
        test('should generate valid simple palette', () => {
            const result = generateSimplePalette('#e74c3c', 4.5);

            assert.ok(isValidHexColor(result.primary));
            assert.ok(isValidHexColor(result.foreground));
        });

        test('foreground should be white or black', () => {
            const result = generateSimplePalette('#3498db', 4.5);

            assert.ok(
                result.foreground === '#ffffff' || result.foreground === '#000000',
                `Expected white or black, got ${result.foreground}`
            );
        });
    });

    suite('edge cases', () => {
        test('should handle very dark colors', () => {
            const palette = generatePalette('#111111', 'dominant', 4.5);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('should handle very light colors', () => {
            const palette = generatePalette('#eeeeee', 'dominant', 4.5);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('should handle saturated colors', () => {
            const palette = generatePalette('#ff0000', 'dominant', 4.5);
            assert.ok(isValidHexColor(palette.primary));
        });

        test('should handle grayscale', () => {
            const palette = generatePalette('#808080', 'dominant', 4.5);
            assert.ok(isValidHexColor(palette.primary));
        });
    });
});
