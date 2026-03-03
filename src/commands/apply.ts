import * as vscode from 'vscode';
import * as path from 'path';
import { getWorkspaceFolder, checkFile, isImageFile } from '../utils/fileHelpers';
import { getConfig } from '../utils/config';
import { findIcon, IconSearchResult } from '../icons/iconFinder';
import { extractDominantColor, getDefaultColor, ColorExtractionResult } from '../colors/colorExtractor';
import { generatePalette } from '../colors/colorGenerator';
import { applyColors } from '../ui/uiApplier';
import { updateStatusBar } from '../ui/statusBar';
import { log, logError, logWarning } from '../utils/logger';

export interface ApplyCommandResult {
    success: boolean;
    color?: string;
    iconPath?: string;
    message: string;
}

interface ExtractionWithFallbackResult {
    success: boolean;
    extraction: ColorExtractionResult;
    iconPath: string | null;
}

/**
 * Generates alternative icon paths based on a failed path.
 * For example, if public/favicon.ico fails, try public/favicon-32x32.png, etc.
 */
function getAlternativeIconPaths(failedPath: string, workspaceRoot: string): string[] {
    const alternatives: string[] = [];
    const dir = path.dirname(failedPath);

    // Common alternatives based on the directory
    const dirBasename = path.basename(dir);

    if (dirBasename === 'public' || dirBasename === 'assets' || dir === workspaceRoot) {
        // Size-specific PNGs
        alternatives.push(
            path.join(dir, 'favicon-32x32.png'),
            path.join(dir, 'favicon-16x16.png'),
            path.join(dir, 'favicon-96x96.png'),
            path.join(dir, 'android-chrome-192x192.png'),
            path.join(dir, 'android-chrome-512x512.png'),
            path.join(dir, 'apple-touch-icon.png'),
            // Standard alternatives
            path.join(dir, 'favicon.png'),
            path.join(dir, 'favicon.svg'),
            path.join(dir, 'icon.png'),
            path.join(dir, 'logo.png'),
            path.join(dir, 'logo.svg')
        );
    }

    // Remove the failed path itself and deduplicate
    return [...new Set(alternatives)].filter(alt => alt !== failedPath);
}

/**
 * Tries to extract color from an icon, with fallback to alternative icons if extraction fails.
 */
async function tryExtractColorWithFallback(
    folder: vscode.WorkspaceFolder,
    initialIconResult: IconSearchResult,
    maxImageSize: number,
    failedPaths: string[]
): Promise<ExtractionWithFallbackResult> {
    // Try the initial icon first
    if (initialIconResult.filePath) {
        log(`Attempting color extraction from: ${initialIconResult.relativePath}`);
        const result = await extractDominantColor(initialIconResult.filePath, maxImageSize);

        if (result.success) {
            log(`Successfully extracted color from: ${initialIconResult.relativePath}`);
            return {
                success: true,
                extraction: result,
                iconPath: initialIconResult.filePath
            };
        }

        // Extraction failed, add to failed paths
        failedPaths.push(initialIconResult.filePath);
        logWarning(`Failed to extract color from ${initialIconResult.relativePath}: ${result.error}`);

        // Get alternative paths to try
        const alternatives = getAlternativeIconPaths(initialIconResult.filePath, folder.uri.fsPath);

        log(`Trying ${alternatives.length} alternative icon paths...`);

        // Try each alternative
        for (const altPath of alternatives) {
            // Skip if already failed
            if (failedPaths.includes(altPath)) {
                continue;
            }

            // Check if file exists and is an image
            const fileCheck = await checkFile(altPath);
            if (!fileCheck.exists || !fileCheck.readable || !isImageFile(altPath)) {
                continue;
            }

            if (fileCheck.size > maxImageSize) {
                logWarning(`Alternative ${path.basename(altPath)} exceeds size limit`);
                continue;
            }

            // Try extraction
            const relativePath = path.relative(folder.uri.fsPath, altPath);
            log(`Attempting color extraction from alternative: ${relativePath}`);

            const altResult = await extractDominantColor(altPath, maxImageSize);

            if (altResult.success) {
                log(`Successfully extracted color from alternative: ${relativePath}`);
                return {
                    success: true,
                    extraction: altResult,
                    iconPath: altPath
                };
            }

            // Failed, add to list and continue
            failedPaths.push(altPath);
            logWarning(`Failed to extract from ${relativePath}: ${altResult.error}`);
        }

        // All alternatives failed
        logWarning(`Failed to extract color from ${failedPaths.length} icon(s). Using default.`);
    }

    // No successful extraction, return default
    return {
        success: false,
        extraction: getDefaultColor(),
        iconPath: null
    };
}

/**
 * Applies Auto Project Colors based on auto-detected favicon.
 * This is the main command for the extension.
 */
export async function applyProjectColor(
    workspaceFolder?: vscode.WorkspaceFolder
): Promise<ApplyCommandResult> {
    // Get workspace folder
    const folder = workspaceFolder ?? getWorkspaceFolder();

    if (!folder) {
        const message = 'No workspace folder open. Open a folder to use Auto Project Colors.';
        vscode.window.showWarningMessage(message);
        return { success: false, message };
    }

    const config = getConfig(folder);

    if (!config.enabled) {
        const message = 'Auto Project Colors is disabled for this workspace.';
        vscode.window.showInformationMessage(message);
        return { success: false, message };
    }

    log(`Applying project color to ${folder.name}`);

    try {
        // Find favicon - with retry for failed extractions
        const iconResult = await findIcon(folder);

        let extractionResult;
        let iconPath: string | null = null;
        const failedPaths: string[] = [];

        // Try to extract color, with fallback to alternative icons if extraction fails
        if (iconResult.found && iconResult.filePath) {
            extractionResult = await tryExtractColorWithFallback(
                folder,
                iconResult,
                config.maxImageSize,
                failedPaths
            );

            // If we got a valid result with an icon path, use it
            if (extractionResult.iconPath) {
                iconPath = extractionResult.iconPath;
            }

            // Show notification if using default after trying alternatives
            if (!extractionResult.success && config.notifyOnApply) {
                vscode.window.showWarningMessage(
                    `Could not extract color from any favicon. Using default color.`
                );
            }
        } else {
            // No favicon found, use default
            logWarning(`No favicon found: ${iconResult.error}`);
            extractionResult = { success: false, extraction: getDefaultColor(), iconPath: null };

            if (config.notifyOnApply) {
                vscode.window.showInformationMessage(
                    `No favicon found in workspace. Using default color.`
                );
            }
        }

        // Get the extraction result
        const finalExtraction = extractionResult.extraction ?? getDefaultColor();

        // Generate palette
        const palette = generatePalette(
            finalExtraction.color!,
            config.paletteStrategy,
            config.contrastTarget
        );

        // Apply colors
        const applyResult = await applyColors(folder, palette, iconPath);

        if (!applyResult.success) {
            const message = `Failed to apply colors: ${applyResult.error}`;
            logError(message);
            vscode.window.showErrorMessage(message);
            return { success: false, message };
        }

        // Update status bar
        updateStatusBar();

        // Show success notification
        const color = palette.primary;
        if (config.notifyOnApply) {
            const source = iconPath
                ? `from ${path.relative(folder.uri.fsPath, iconPath)}`
                : '(default)';
            vscode.window.showInformationMessage(
                `Applied project color ${color} ${source}`
            );
        }

        log(`Successfully applied color ${color} to ${folder.name}`);

        return {
            success: true,
            color,
            iconPath: iconPath ?? undefined,
            message: `Applied color ${color}`
        };
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Failed to apply project color to ${folder.name}`, error);
        vscode.window.showErrorMessage(`Failed to apply project color: ${errorMessage}`);
        return {
            success: false,
            message: `Failed: ${errorMessage}`
        };
    }
}

/**
 * Registers the apply command.
 */
export function registerApplyCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.apply', async () => {
        await applyProjectColor();
    });
}
