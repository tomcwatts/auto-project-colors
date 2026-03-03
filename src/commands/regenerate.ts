import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { getConfig, PaletteStrategy } from '../utils/config';
import { getStateManager } from '../ui/stateManager';
import { extractDominantColor, getDefaultColor } from '../colors/colorExtractor';
import { generatePalette } from '../colors/colorGenerator';
import { applyColors, hasAppliedColors } from '../ui/uiApplier';
import { updateStatusBar } from '../ui/statusBar';
import { log, logError } from '../utils/logger';

interface StrategyQuickPickItem extends vscode.QuickPickItem {
    strategy: PaletteStrategy;
}

const STRATEGY_OPTIONS: StrategyQuickPickItem[] = [
    {
        label: '$(paintcan) Dominant',
        description: 'Use the most dominant color from the image',
        strategy: 'dominant'
    },
    {
        label: '$(zap) Vibrant',
        description: 'Use a more saturated, vibrant version',
        strategy: 'vibrant'
    },
    {
        label: '$(eye-closed) Muted',
        description: 'Use a desaturated, muted version',
        strategy: 'muted'
    },
    {
        label: '$(heart) Pastel',
        description: 'Use a soft, pastel version',
        strategy: 'pastel'
    }
];

/**
 * Regenerates colors with a different palette strategy.
 * Reuses the previously detected favicon.
 */
export async function regenerateWithStrategy(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const config = getConfig(folder);
    const stateManager = getStateManager();

    // Check if we have a previously detected icon
    const iconPath = stateManager.getIconPath(folder);

    if (!iconPath && !hasAppliedColors(folder)) {
        // No previous icon, offer to detect first
        const choice = await vscode.window.showInformationMessage(
            'No project color has been applied yet. Would you like to apply one first?',
            'Apply Auto Project Colors',
            'Cancel'
        );

        if (choice === 'Apply Auto Project Colors') {
            await vscode.commands.executeCommand('projectColor.apply');
        }
        return;
    }

    // Show strategy picker
    const currentStrategy = config.paletteStrategy;
    const sortedOptions = [...STRATEGY_OPTIONS].sort((a, b) => {
        // Put current strategy first
        if (a.strategy === currentStrategy) {
            return -1;
        }
        if (b.strategy === currentStrategy) {
            return 1;
        }
        return 0;
    });

    // Mark current strategy
    sortedOptions[0] = {
        ...sortedOptions[0],
        label: sortedOptions[0].label + ' (current)',
        picked: true
    };

    const selectedOption = await vscode.window.showQuickPick(sortedOptions, {
        placeHolder: 'Select a color palette strategy',
        title: 'Regenerate Auto Project Colors'
    });

    if (!selectedOption) {
        // User cancelled
        return;
    }

    const newStrategy = selectedOption.strategy;
    log(`Regenerating with strategy: ${newStrategy}`);

    try {
        let extractionResult;

        if (iconPath) {
            // Re-extract color from the same icon
            extractionResult = await extractDominantColor(iconPath, config.maxImageSize);

            if (!extractionResult.success) {
                extractionResult = getDefaultColor();
                vscode.window.showWarningMessage('Could not re-extract color. Using default.');
            }
        } else {
            // No icon path stored, use current color from state
            const currentColor = stateManager.getCurrentColor(folder);
            if (currentColor) {
                extractionResult = { success: true, color: currentColor };
            } else {
                extractionResult = getDefaultColor();
            }
        }

        // Generate new palette with selected strategy
        const palette = generatePalette(
            extractionResult.color!,
            newStrategy,
            config.contrastTarget
        );

        // Apply colors
        const applyResult = await applyColors(folder, palette, iconPath);

        if (!applyResult.success) {
            vscode.window.showErrorMessage(`Failed to apply colors: ${applyResult.error}`);
            return;
        }

        updateStatusBar();

        if (config.notifyOnApply) {
            vscode.window.showInformationMessage(
                `Regenerated project color ${palette.primary} with ${newStrategy} strategy`
            );
        }

        log(`Successfully regenerated with ${newStrategy} strategy: ${palette.primary}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Failed to regenerate colors`, error);
        vscode.window.showErrorMessage(`Failed to regenerate: ${errorMessage}`);
    }
}

/**
 * Registers the regenerate command.
 */
export function registerRegenerateCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.regenerate', async () => {
        await regenerateWithStrategy();
    });
}
