import {
    hexToRgb,
    rgbToHex,
    rgbToHsl,
    hslToRgb,
    getRelativeLuminance
} from '../utils/colorValidation';
import { log } from '../utils/logger';

export interface NormalizationOptions {
    minLuminance: number;
    maxLuminance: number;
    targetSaturation?: number;
}

const DEFAULT_OPTIONS: NormalizationOptions = {
    minLuminance: 0.15,
    maxLuminance: 0.85
};

/**
 * Normalizes a color to ensure it's suitable for UI use.
 * Adjusts luminance to avoid extremes (pure white/black).
 */
export function normalizeColor(hex: string, options: NormalizationOptions = DEFAULT_OPTIONS): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);
    const luminance = getRelativeLuminance(rgb);

    let adjustedHsl = { ...hsl };
    let wasAdjusted = false;

    // Adjust lightness if luminance is too extreme
    if (luminance < options.minLuminance) {
        // Too dark - lighten
        adjustedHsl.l = Math.min(0.5, hsl.l + (options.minLuminance - luminance) * 2);
        wasAdjusted = true;
    } else if (luminance > options.maxLuminance) {
        // Too light - darken
        adjustedHsl.l = Math.max(0.3, hsl.l - (luminance - options.maxLuminance) * 2);
        wasAdjusted = true;
    }

    // Optionally adjust saturation
    if (options.targetSaturation !== undefined && hsl.s < options.targetSaturation) {
        adjustedHsl.s = Math.min(1, options.targetSaturation);
        wasAdjusted = true;
    }

    if (wasAdjusted) {
        const adjustedRgb = hslToRgb(adjustedHsl);
        const newHex = rgbToHex(adjustedRgb);
        log(`Normalized color: ${hex} -> ${newHex}`);
        return newHex;
    }

    return hex;
}

/**
 * Adjusts the lightness of a color by a percentage.
 * Positive values lighten, negative values darken.
 */
export function adjustLightness(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);
    hsl.l = Math.max(0, Math.min(1, hsl.l + amount));

    const adjustedRgb = hslToRgb(hsl);
    return rgbToHex(adjustedRgb);
}

/**
 * Adjusts the saturation of a color by a percentage.
 */
export function adjustSaturation(hex: string, amount: number): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);
    hsl.s = Math.max(0, Math.min(1, hsl.s + amount));

    const adjustedRgb = hslToRgb(hsl);
    return rgbToHex(adjustedRgb);
}

/**
 * Creates a darkened variant of a color (for hover/active states).
 */
export function darken(hex: string, amount: number = 0.15): string {
    return adjustLightness(hex, -amount);
}

/**
 * Creates a lightened variant of a color.
 */
export function lighten(hex: string, amount: number = 0.15): string {
    return adjustLightness(hex, amount);
}

/**
 * Creates a more saturated (vibrant) version of a color.
 */
export function saturate(hex: string, amount: number = 0.2): string {
    return adjustSaturation(hex, amount);
}

/**
 * Creates a less saturated (muted) version of a color.
 */
export function desaturate(hex: string, amount: number = 0.2): string {
    return adjustSaturation(hex, -amount);
}

/**
 * Converts a color to a pastel version.
 * Reduces saturation and increases lightness.
 */
export function toPastel(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);

    // Pastel colors have reduced saturation and high lightness
    hsl.s = Math.max(0.2, Math.min(0.5, hsl.s * 0.6));
    hsl.l = Math.max(0.6, Math.min(0.85, hsl.l + 0.2));

    const adjustedRgb = hslToRgb(hsl);
    return rgbToHex(adjustedRgb);
}

/**
 * Converts a color to a vibrant version.
 * Increases saturation while keeping luminance reasonable.
 */
export function toVibrant(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);

    // Vibrant colors have high saturation
    hsl.s = Math.min(1, hsl.s * 1.5 + 0.2);

    // Keep lightness in a good range
    if (hsl.l < 0.3) {
        hsl.l = 0.35;
    } else if (hsl.l > 0.7) {
        hsl.l = 0.65;
    }

    const adjustedRgb = hslToRgb(hsl);
    return rgbToHex(adjustedRgb);
}

/**
 * Converts a color to a muted version.
 * Reduces saturation significantly.
 */
export function toMuted(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);

    // Muted colors have low saturation
    hsl.s = Math.max(0.1, hsl.s * 0.4);

    // Keep lightness moderate
    if (hsl.l < 0.35) {
        hsl.l = 0.4;
    } else if (hsl.l > 0.65) {
        hsl.l = 0.6;
    }

    const adjustedRgb = hslToRgb(hsl);
    return rgbToHex(adjustedRgb);
}

/**
 * Generates the complementary color (opposite on color wheel).
 */
export function getComplementary(hex: string): string {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return hex;
    }

    const hsl = rgbToHsl(rgb);
    hsl.h = (hsl.h + 0.5) % 1; // Rotate 180 degrees

    const complementaryRgb = hslToRgb(hsl);
    return rgbToHex(complementaryRgb);
}

/**
 * Generates analogous colors (adjacent on color wheel).
 */
export function getAnalogous(hex: string, angle: number = 30): { left: string; right: string } {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return { left: hex, right: hex };
    }

    const hsl = rgbToHsl(rgb);
    const angleNormalized = angle / 360;

    const leftHsl = { ...hsl, h: (hsl.h - angleNormalized + 1) % 1 };
    const rightHsl = { ...hsl, h: (hsl.h + angleNormalized) % 1 };

    return {
        left: rgbToHex(hslToRgb(leftHsl)),
        right: rgbToHex(hslToRgb(rightHsl))
    };
}

/**
 * Checks if a color is considered "light" based on luminance.
 */
export function isLightColor(hex: string): boolean {
    const rgb = hexToRgb(hex);
    if (!rgb) {
        return false;
    }

    const luminance = getRelativeLuminance(rgb);
    return luminance > 0.5;
}

/**
 * Checks if a color is considered "dark" based on luminance.
 */
export function isDarkColor(hex: string): boolean {
    return !isLightColor(hex);
}
