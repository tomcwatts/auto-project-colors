/**
 * Validates and converts hex color values.
 * Supports 3-char (#RGB), 6-char (#RRGGBB), and 8-char (#RRGGBBAA) formats.
 */
export function isValidHexColor(hex: string): boolean {
    if (typeof hex !== 'string') {
        return false;
    }
    return /^#([A-Fa-f0-9]{3}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{8})$/.test(hex);
}

/**
 * Normalizes a hex color to 6-char format (#RRGGBB).
 * Returns null if invalid.
 */
export function normalizeHexColor(hex: string): string | null {
    if (!isValidHexColor(hex)) {
        return null;
    }

    const cleanHex = hex.slice(1);

    // Convert 3-char to 6-char
    if (cleanHex.length === 3) {
        return '#' + cleanHex.split('').map(c => c + c).join('').toLowerCase();
    }

    // Strip alpha channel if present
    if (cleanHex.length === 8) {
        return '#' + cleanHex.slice(0, 6).toLowerCase();
    }

    return '#' + cleanHex.toLowerCase();
}

export interface RGB {
    r: number;
    g: number;
    b: number;
}

export interface HSL {
    h: number;
    s: number;
    l: number;
}

/**
 * Converts a hex color to RGB values.
 */
export function hexToRgb(hex: string): RGB | null {
    const normalizedHex = normalizeHexColor(hex);
    if (!normalizedHex) {
        return null;
    }

    const result = /^#([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(normalizedHex);
    if (!result) {
        return null;
    }

    return {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    };
}

/**
 * Converts RGB values to a hex color string.
 */
export function rgbToHex(rgb: RGB): string {
    const r = Math.max(0, Math.min(255, Math.round(rgb.r)));
    const g = Math.max(0, Math.min(255, Math.round(rgb.g)));
    const b = Math.max(0, Math.min(255, Math.round(rgb.b)));

    return '#' + [r, g, b]
        .map(x => x.toString(16).padStart(2, '0'))
        .join('');
}

/**
 * Converts RGB to HSL.
 */
export function rgbToHsl(rgb: RGB): HSL {
    const r = rgb.r / 255;
    const g = rgb.g / 255;
    const b = rgb.b / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (max === min) {
        return { h: 0, s: 0, l };
    }

    const d = max - min;
    const s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    let h: number;
    switch (max) {
        case r:
            h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
            break;
        case g:
            h = ((b - r) / d + 2) / 6;
            break;
        default:
            h = ((r - g) / d + 4) / 6;
            break;
    }

    return { h, s, l };
}

/**
 * Converts HSL to RGB.
 */
export function hslToRgb(hsl: HSL): RGB {
    const { h, s, l } = hsl;

    if (s === 0) {
        const val = Math.round(l * 255);
        return { r: val, g: val, b: val };
    }

    const hueToRgb = (p: number, q: number, t: number): number => {
        let adjustedT = t;
        if (adjustedT < 0) {
            adjustedT += 1;
        }
        if (adjustedT > 1) {
            adjustedT -= 1;
        }
        if (adjustedT < 1/6) {
            return p + (q - p) * 6 * adjustedT;
        }
        if (adjustedT < 1/2) {
            return q;
        }
        if (adjustedT < 2/3) {
            return p + (q - p) * (2/3 - adjustedT) * 6;
        }
        return p;
    };

    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;

    return {
        r: Math.round(hueToRgb(p, q, h + 1/3) * 255),
        g: Math.round(hueToRgb(p, q, h) * 255),
        b: Math.round(hueToRgb(p, q, h - 1/3) * 255)
    };
}

/**
 * Calculates the relative luminance of a color.
 * Used for WCAG contrast calculations.
 */
export function getRelativeLuminance(rgb: RGB): number {
    const [r, g, b] = [rgb.r, rgb.g, rgb.b].map(val => {
        const sRgb = val / 255;
        return sRgb <= 0.03928
            ? sRgb / 12.92
            : Math.pow((sRgb + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calculates the contrast ratio between two colors.
 * Returns a value between 1 and 21.
 */
export function getContrastRatio(color1: RGB, color2: RGB): number {
    const l1 = getRelativeLuminance(color1);
    const l2 = getRelativeLuminance(color2);

    const lighter = Math.max(l1, l2);
    const darker = Math.min(l1, l2);

    return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Checks if a contrast ratio meets WCAG requirements.
 */
export function meetsContrastRequirement(ratio: number, target: number): boolean {
    return ratio >= target;
}

/**
 * Determines if text should be light or dark on a given background color.
 */
export function getOptimalTextColor(backgroundColor: RGB): string {
    const luminance = getRelativeLuminance(backgroundColor);
    // Use white text on dark backgrounds, black text on light backgrounds
    return luminance > 0.179 ? '#000000' : '#ffffff';
}

/**
 * Determines optimal foreground color (white or black) for a given background
 * that meets the specified contrast target.
 */
export function getContrastingForeground(backgroundColor: RGB, contrastTarget: number): string {
    const white: RGB = { r: 255, g: 255, b: 255 };
    const black: RGB = { r: 0, g: 0, b: 0 };

    const whiteContrast = getContrastRatio(backgroundColor, white);
    const blackContrast = getContrastRatio(backgroundColor, black);

    // Prefer the color with better contrast
    if (whiteContrast >= contrastTarget && blackContrast >= contrastTarget) {
        return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
    }

    if (whiteContrast >= contrastTarget) {
        return '#ffffff';
    }

    if (blackContrast >= contrastTarget) {
        return '#000000';
    }

    // Neither meets target, return the one with higher contrast
    return whiteContrast >= blackContrast ? '#ffffff' : '#000000';
}

/**
 * Creates a color with adjusted alpha channel.
 */
export function withAlpha(hex: string, alpha: number): string {
    const normalized = normalizeHexColor(hex);
    if (!normalized) {
        return hex;
    }

    const alphaHex = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0');

    return normalized + alphaHex;
}

/**
 * Alpha-blends a foreground color over a background color.
 * Returns the effective RGB of the blended result.
 */
export function alphaBlend(fg: RGB, bg: RGB, alpha: number): RGB {
    const a = Math.max(0, Math.min(1, alpha));
    return {
        r: Math.round(fg.r * a + bg.r * (1 - a)),
        g: Math.round(fg.g * a + bg.g * (1 - a)),
        b: Math.round(fg.b * a + bg.b * (1 - a))
    };
}
