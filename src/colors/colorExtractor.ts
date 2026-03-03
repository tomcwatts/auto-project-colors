import * as path from 'path';
import { readFileBuffer, isSvgFile } from '../utils/fileHelpers';
import { rgbToHex, RGB } from '../utils/colorValidation';
import { log, logError, logWarning } from '../utils/logger';

export interface ColorExtractionResult {
    success: boolean;
    color?: string;
    rgb?: RGB;
    error?: string;
}

const DEFAULT_COLOR = '#888888';
const SAMPLE_SIZE = 100; // Resize to 100x100 for sampling
const SHARP_TIMEOUT_MS = 8000; // Maximum ms to wait for Sharp image processing

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
    return Promise.race([
        promise,
        new Promise<T>((_, reject) =>
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
        )
    ]);
}

/**
 * Extracts the dominant color from an image file using sharp.
 * Resizes to a small sample size for fast processing.
 */
export async function extractDominantColor(
    filePath: string,
    maxImageSize: number
): Promise<ColorExtractionResult> {
    // Handle SVG files specially
    if (isSvgFile(filePath)) {
        return extractColorFromSvg(filePath, maxImageSize);
    }

    // Early exit for ICO files - Sharp has no ICO decoder
    if (filePath.toLowerCase().endsWith('.ico')) {
        logWarning(`ICO format is not supported for color extraction: ${filePath}. Convert to PNG or SVG for best results.`);
        return {
            success: false,
            error: 'ICO format is not supported. Convert your favicon to PNG or SVG for color extraction.'
        };
    }

    try {
        // Read file buffer
        const buffer = await readFileBuffer(filePath, maxImageSize);
        if (!buffer) {
            return {
                success: false,
                error: 'Failed to read image file'
            };
        }

        // Use sharp for image processing
        const sharp = await import('sharp');
        const image = sharp.default(buffer);

        // Get image metadata to validate
        const metadata = await image.metadata();
        if (!metadata.width || !metadata.height) {
            return {
                success: false,
                error: 'Invalid image: missing dimensions'
            };
        }

        log(`Processing image: ${path.basename(filePath)} (${metadata.width}x${metadata.height}, hasAlpha: ${metadata.hasAlpha})`);

        // Resize to sample size and get raw pixel data
        // Keep alpha channel to properly handle transparent images
        const { data, info } = await withTimeout(
            image
                .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
                .ensureAlpha() // Ensure we have alpha channel for consistent processing
                .raw()
                .toBuffer({ resolveWithObject: true }),
            SHARP_TIMEOUT_MS,
            'Image processing'
        );

        // Extract dominant color, handling transparency
        const dominantColor = findDominantColorWithAlpha(data, info.width, info.height);

        if (!dominantColor) {
            // If no color found (all transparent), try flattening with white background
            log('No opaque pixels found, trying with white background...');
            const { data: flatData, info: flatInfo } = await withTimeout(
                sharp.default(buffer)
                    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
                    .flatten({ background: { r: 255, g: 255, b: 255 } })
                    .raw()
                    .toBuffer({ resolveWithObject: true }),
                SHARP_TIMEOUT_MS,
                'Image processing (flatten)'
            );

            const flatColor = findDominantColor(flatData, flatInfo.width, flatInfo.height);
            log(`Extracted color (flattened): ${rgbToHex(flatColor)}`);
            return {
                success: true,
                color: rgbToHex(flatColor),
                rgb: flatColor
            };
        }

        log(`Extracted color: ${rgbToHex(dominantColor)}`);

        return {
            success: true,
            color: rgbToHex(dominantColor),
            rgb: dominantColor
        };
    } catch (error) {
        logError(`Failed to extract color from ${filePath}`, error);

        // Provide more specific error messages
        if (error instanceof Error) {
            if (error.message.includes('Input file is missing')) {
                return {
                    success: false,
                    error: 'Image file not found'
                };
            }
            if (error.message.includes('unsupported image format') || error.message.includes('Input buffer contains unsupported')) {
                return {
                    success: false,
                    error: 'Unsupported image format'
                };
            }
        }

        return {
            success: false,
            error: 'Failed to process image'
        };
    }
}

/**
 * Attempts to extract a color from an SVG file.
 * SVG color extraction is limited; we look for fill/stroke colors.
 */
async function extractColorFromSvg(
    filePath: string,
    maxImageSize: number
): Promise<ColorExtractionResult> {
    try {
        const fs = await import('fs');
        const stats = await fs.promises.stat(filePath);

        if (stats.size > maxImageSize) {
            return {
                success: false,
                error: 'SVG file exceeds size limit'
            };
        }

        const content = await fs.promises.readFile(filePath, 'utf-8');

        // Try to find hex colors in fill or stroke attributes (3, 6, or 8-char with alpha)
        const hexColorRegex = /#([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})\b/g;
        const matches = content.match(hexColorRegex);

        if (matches && matches.length > 0) {
            // Use the first non-white, non-black color found
            for (const match of matches) {
                let normalized = match.toLowerCase();
                // Strip alpha channel from 8-char hex (#rrggbbaa → #rrggbb)
                if (normalized.length === 9) {
                    normalized = normalized.slice(0, 7);
                }
                // Expand 3-char to 6-char
                if (normalized.length === 4) {
                    normalized = '#' + normalized[1] + normalized[1] + normalized[2] + normalized[2] + normalized[3] + normalized[3];
                }
                if (normalized !== '#ffffff' && normalized !== '#000000') {
                    log(`Extracted color from SVG: ${normalized}`);
                    const rgb = hexToRgbSimple(normalized);
                    return {
                        success: true,
                        color: normalized,
                        rgb
                    };
                }
            }
        }

        // Try to rasterize the SVG with sharp
        try {
            const buffer = await fs.promises.readFile(filePath);
            const sharp = await import('sharp');

            const { data, info } = await withTimeout(
                sharp.default(buffer)
                    .resize(SAMPLE_SIZE, SAMPLE_SIZE, { fit: 'cover' })
                    .flatten({ background: { r: 255, g: 255, b: 255 } }) // Add white background
                    .raw()
                    .toBuffer({ resolveWithObject: true }),
                SHARP_TIMEOUT_MS,
                'SVG rasterization'
            );

            const dominantColor = findDominantColor(data, info.width, info.height);

            // Check if it's not too close to white (from background)
            const luminance = (dominantColor.r * 0.299 + dominantColor.g * 0.587 + dominantColor.b * 0.114) / 255;
            if (luminance < 0.95) {
                log(`Extracted color from rasterized SVG: ${rgbToHex(dominantColor)}`);
                return {
                    success: true,
                    color: rgbToHex(dominantColor),
                    rgb: dominantColor
                };
            }
        } catch {
            // SVG rasterization failed, continue to fallback
        }

        logWarning(`Could not extract meaningful color from SVG: ${filePath}`);
        return {
            success: false,
            error: 'Could not extract color from SVG (no colors found or only black/white)'
        };
    } catch (error) {
        logError(`Failed to process SVG: ${filePath}`, error);
        return {
            success: false,
            error: 'Failed to read SVG file'
        };
    }
}

/**
 * Simple hex to RGB conversion for SVG extraction.
 */
function hexToRgbSimple(hex: string): RGB {
    let cleanHex = hex.replace('#', '');
    if (cleanHex.length === 3) {
        cleanHex = cleanHex[0] + cleanHex[0] + cleanHex[1] + cleanHex[1] + cleanHex[2] + cleanHex[2];
    }
    return {
        r: parseInt(cleanHex.substring(0, 2), 16),
        g: parseInt(cleanHex.substring(2, 4), 16),
        b: parseInt(cleanHex.substring(4, 6), 16)
    };
}

/**
 * Finds the dominant color in RGBA pixel data, skipping transparent pixels.
 * Returns null if no opaque pixels are found.
 */
function findDominantColorWithAlpha(data: Buffer, width: number, height: number): RGB | null {
    const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    const bucketSize = 32;
    let opaquePixelCount = 0;

    // Process each pixel (4 bytes per pixel for RGBA)
    for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent or nearly transparent pixels
        if (a < 128) {
            continue;
        }

        opaquePixelCount++;

        // Skip very bright pixels (likely white background)
        const brightness = (r + g + b) / 3;
        if (brightness > 250) {
            continue;
        }

        // Skip very dark pixels (likely black)
        if (brightness < 5) {
            continue;
        }

        // Create bucket key
        const bucketR = Math.floor(r / bucketSize) * bucketSize;
        const bucketG = Math.floor(g / bucketSize) * bucketSize;
        const bucketB = Math.floor(b / bucketSize) * bucketSize;
        const key = `${bucketR},${bucketG},${bucketB}`;

        const existing = colorBuckets.get(key);
        if (existing) {
            existing.count++;
            existing.r += r;
            existing.g += g;
            existing.b += b;
        } else {
            colorBuckets.set(key, { count: 1, r, g, b });
        }
    }

    log(`Found ${opaquePixelCount} opaque pixels, ${colorBuckets.size} color buckets`);

    // If very few opaque pixels, return null to trigger fallback
    if (opaquePixelCount < 100) {
        return null;
    }

    // Find the most common bucket
    let maxCount = 0;
    let dominantBucket: { count: number; r: number; g: number; b: number } | null = null;

    for (const bucket of colorBuckets.values()) {
        if (bucket.count > maxCount) {
            maxCount = bucket.count;
            dominantBucket = bucket;
        }
    }

    if (!dominantBucket || maxCount === 0) {
        return null;
    }

    // Return the average color of the dominant bucket
    return {
        r: Math.round(dominantBucket.r / dominantBucket.count),
        g: Math.round(dominantBucket.g / dominantBucket.count),
        b: Math.round(dominantBucket.b / dominantBucket.count)
    };
}

/**
 * Finds the dominant color in raw RGB pixel data (no alpha).
 * Groups similar colors and returns the most common group's average.
 */
function findDominantColor(data: Buffer, width: number, height: number): RGB {
    const colorBuckets = new Map<string, { count: number; r: number; g: number; b: number }>();
    const bucketSize = 32; // Group colors into buckets of 32 (256/8 = 32 buckets per channel)

    // Process each pixel (3 bytes per pixel for RGB)
    for (let i = 0; i < data.length; i += 3) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];

        // Skip very bright pixels (likely background)
        const brightness = (r + g + b) / 3;
        if (brightness > 250) {
            continue;
        }

        // Skip very dark pixels
        if (brightness < 5) {
            continue;
        }

        // Create bucket key
        const bucketR = Math.floor(r / bucketSize) * bucketSize;
        const bucketG = Math.floor(g / bucketSize) * bucketSize;
        const bucketB = Math.floor(b / bucketSize) * bucketSize;
        const key = `${bucketR},${bucketG},${bucketB}`;

        const existing = colorBuckets.get(key);
        if (existing) {
            existing.count++;
            existing.r += r;
            existing.g += g;
            existing.b += b;
        } else {
            colorBuckets.set(key, { count: 1, r, g, b });
        }
    }

    // Find the most common bucket
    let maxCount = 0;
    let dominantBucket: { count: number; r: number; g: number; b: number } | null = null;

    for (const bucket of colorBuckets.values()) {
        if (bucket.count > maxCount) {
            maxCount = bucket.count;
            dominantBucket = bucket;
        }
    }

    if (!dominantBucket || maxCount === 0) {
        // Fallback: return middle gray
        return { r: 128, g: 128, b: 128 };
    }

    // Return the average color of the dominant bucket
    return {
        r: Math.round(dominantBucket.r / dominantBucket.count),
        g: Math.round(dominantBucket.g / dominantBucket.count),
        b: Math.round(dominantBucket.b / dominantBucket.count)
    };
}

/**
 * Gets the default fallback color when extraction fails.
 */
export function getDefaultColor(): ColorExtractionResult {
    return {
        success: true,
        color: DEFAULT_COLOR,
        rgb: { r: 136, g: 136, b: 136 }
    };
}
