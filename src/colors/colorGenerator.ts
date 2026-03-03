import { PaletteStrategy } from '../utils/config';
import {
    hexToRgb,
    getContrastingForeground
} from '../utils/colorValidation';
import {
    normalizeColor,
    darken,
    lighten,
    toVibrant,
    toMuted,
    toPastel,
    getComplementary
} from './colorNormalizer';
import { log } from '../utils/logger';

export interface ColorPalette {
    primary: string;
    primaryForeground: string;
    darkened: string;
    darkenedForeground: string;
    lightened: string;
    lightenedForeground: string;
    accent: string;
    accentForeground: string;
}

/**
 * Generates a complete color palette from a base color.
 */
export function generatePalette(
    baseColor: string,
    strategy: PaletteStrategy,
    contrastTarget: number
): ColorPalette {
    log(`Generating palette with strategy: ${strategy}`);

    // First normalize the base color
    let primary = normalizeColor(baseColor);

    // Apply strategy transformation
    switch (strategy) {
        case 'vibrant':
            primary = toVibrant(primary);
            break;
        case 'muted':
            primary = toMuted(primary);
            break;
        case 'pastel':
            primary = toPastel(primary);
            break;
        case 'dominant':
        default:
            // Keep the normalized dominant color as-is
            break;
    }

    // Generate variants
    const darkened = darken(primary, 0.15);
    const lightened = lighten(primary, 0.15);
    const accent = getComplementary(primary);

    // Calculate foreground colors for contrast
    const primaryRgb = hexToRgb(primary);
    const darkenedRgb = hexToRgb(darkened);
    const lightenedRgb = hexToRgb(lightened);
    const accentRgb = hexToRgb(accent);

    const palette: ColorPalette = {
        primary,
        primaryForeground: primaryRgb ? getContrastingForeground(primaryRgb, contrastTarget) : '#ffffff',
        darkened,
        darkenedForeground: darkenedRgb ? getContrastingForeground(darkenedRgb, contrastTarget) : '#ffffff',
        lightened,
        lightenedForeground: lightenedRgb ? getContrastingForeground(lightenedRgb, contrastTarget) : '#000000',
        accent,
        accentForeground: accentRgb ? getContrastingForeground(accentRgb, contrastTarget) : '#ffffff'
    };

    log(`Generated palette: primary=${palette.primary}, darkened=${palette.darkened}, lightened=${palette.lightened}`);

    return palette;
}

/**
 * Generates a simpler palette with just primary and foreground.
 * Useful for quick previews.
 */
export function generateSimplePalette(
    baseColor: string,
    contrastTarget: number
): { primary: string; foreground: string } {
    const primary = normalizeColor(baseColor);
    const primaryRgb = hexToRgb(primary);

    return {
        primary,
        foreground: primaryRgb ? getContrastingForeground(primaryRgb, contrastTarget) : '#ffffff'
    };
}

/**
 * Adjusts a palette for a specific UI context.
 * For example, status bar might need slightly different treatment than title bar.
 */
export function adjustPaletteForContext(
    palette: ColorPalette,
    context: 'titleBar' | 'activityBar' | 'statusBar' | 'tabBar' | 'sideBar'
): { background: string; foreground: string } {
    switch (context) {
        case 'titleBar':
            // Title bar uses the primary color
            return {
                background: palette.primary,
                foreground: palette.primaryForeground
            };

        case 'activityBar':
            // Activity bar often looks better slightly darkened
            return {
                background: palette.darkened,
                foreground: palette.darkenedForeground
            };

        case 'statusBar':
            // Status bar uses primary color
            return {
                background: palette.primary,
                foreground: palette.primaryForeground
            };

        case 'tabBar':
            // Tab bar uses lightened variant for subtle effect
            return {
                background: palette.lightened,
                foreground: palette.lightenedForeground
            };

        case 'sideBar': {
            // Sidebar uses a lighter variant — recompute foreground against actual background
            const sideBarBg = lighten(palette.primary, 0.3);
            const sideBarBgRgb = hexToRgb(sideBarBg);
            const sideBarFg = sideBarBgRgb
                ? getContrastingForeground(sideBarBgRgb, 4.5)
                : palette.primaryForeground;
            return {
                background: sideBarBg,
                foreground: sideBarFg
            };
        }

        default:
            return {
                background: palette.primary,
                foreground: palette.primaryForeground
            };
    }
}
