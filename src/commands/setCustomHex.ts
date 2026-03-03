import * as vscode from 'vscode';
import { getConfig } from '../utils/config';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { generatePalette } from '../colors/colorGenerator';
import { applyColors } from '../ui/uiApplier';
import { log, logError } from '../utils/logger';
import { hexToRgb } from '../utils/colorValidation';

/**
 * Command to set a custom hex color manually.
 * Prompts the user for a hex code and applies it with proper contrast adjustments.
 */
export async function setCustomHexCommand(): Promise<void> {
    const folder = getWorkspaceFolder();
    if (!folder) {
        vscode.window.showErrorMessage('No workspace folder open');
        return;
    }

    // Prompt user for hex code
    const hexInput = await vscode.window.showInputBox({
        prompt: 'Enter a hex color code (e.g., #3498db or 3498db)',
        placeHolder: '#3498db',
        validateInput: (value: string) => {
            // Remove # if present and validate
            const cleanHex = value.replace(/^#/, '');

            // Check if it's a valid 3 or 6 character hex
            if (!/^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleanHex)) {
                return 'Please enter a valid hex color (e.g., #3498db or 3498db)';
            }

            return null;
        }
    });

    if (!hexInput) {
        return; // User cancelled
    }

    try {
        // Normalize the hex code
        let hexColor = hexInput.trim().replace(/^#/, '');

        // Expand 3-digit hex to 6-digit
        if (hexColor.length === 3) {
            hexColor = hexColor[0] + hexColor[0] +
                       hexColor[1] + hexColor[1] +
                       hexColor[2] + hexColor[2];
        }

        hexColor = '#' + hexColor.toLowerCase();

        // Convert to RGB to validate
        const rgb = hexToRgb(hexColor);
        if (!rgb) {
            vscode.window.showErrorMessage('Invalid hex color format');
            return;
        }

        log(`Setting custom hex color: ${hexColor}`);

        // Detect current VS Code theme (dark/light)
        const themeKind = vscode.window.activeColorTheme.kind;
        const isDark = themeKind === vscode.ColorThemeKind.Dark ||
                       themeKind === vscode.ColorThemeKind.HighContrast;

        log(`Current theme: ${isDark ? 'dark' : 'light'}`);

        // Get config for contrast target and palette strategy
        const config = getConfig(folder);

        // Generate palette from the custom color
        // The palette generator already handles contrast and theme awareness
        const palette = generatePalette(hexColor, config.paletteStrategy, config.contrastTarget);

        log(`Generated palette from custom hex: primary=${palette.primary}, darkened=${palette.darkened}, lightened=${palette.lightened}`);

        // Apply the colors
        const result = await applyColors(folder, palette, null);

        if (result.success) {
            vscode.window.showInformationMessage(
                `Applied custom color ${hexColor} with ${result.appliedKeys.length} customizations`
            );
        } else {
            vscode.window.showErrorMessage(
                `Failed to apply custom color: ${result.error ?? 'Unknown error'}`
            );
        }
    } catch (error) {
        logError('Failed to set custom hex color', error);
        vscode.window.showErrorMessage(
            `Failed to set custom color: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
    }
}

/**
 * Registers the set custom hex command.
 */
export function registerSetCustomHexCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.setCustomHex', async () => {
        await setCustomHexCommand();
    });
}
