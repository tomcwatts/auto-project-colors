import * as vscode from 'vscode';
import { getConfig, ProjectColorConfig } from '../utils/config';
import { ColorPalette, adjustPaletteForContext } from '../colors/colorGenerator';
import { getStateManager } from './stateManager';
import { log, logError } from '../utils/logger';

// Keys for workbench color customizations
const COLOR_KEYS = {
    titleBar: {
        background: 'titleBar.activeBackground',
        foreground: 'titleBar.activeForeground',
        inactiveBackground: 'titleBar.inactiveBackground',
        inactiveForeground: 'titleBar.inactiveForeground'
    },
    activityBar: {
        background: 'activityBar.background',
        foreground: 'activityBar.foreground',
        inactiveForeground: 'activityBar.inactiveForeground',
        activeBorder: 'activityBar.activeBorder'
    },
    statusBar: {
        background: 'statusBar.background',
        foreground: 'statusBar.foreground',
        noFolderBackground: 'statusBar.noFolderBackground',
        debuggingBackground: 'statusBar.debuggingBackground'
    },
    tabBar: {
        activeBackground: 'tab.activeBackground',
        activeForeground: 'tab.activeForeground',
        activeBorder: 'tab.activeBorder',
        activeBorderTop: 'tab.activeBorderTop'
    },
    sideBar: {
        background: 'sideBar.background',
        foreground: 'sideBar.foreground'
    },
    misc: {
        focusBorder: 'focusBorder'
    }
};

export interface ApplyResult {
    success: boolean;
    appliedKeys: string[];
    error?: string;
}

/**
 * Gets the current workbench color customizations.
 */
async function getExistingColorCustomizations(
    workspaceFolder: vscode.WorkspaceFolder
): Promise<Record<string, string>> {
    const config = vscode.workspace.getConfiguration('workbench', workspaceFolder.uri);
    const colorCustomizations = config.get<Record<string, string>>('colorCustomizations') ?? {};
    return colorCustomizations;
}

/**
 * Applies color customizations to the workbench, merging with existing settings.
 */
async function setColorCustomizations(
    workspaceFolder: vscode.WorkspaceFolder,
    newColors: Record<string, string>
): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench', workspaceFolder.uri);
    const existingColors = await getExistingColorCustomizations(workspaceFolder);

    // Merge new colors with existing, new takes precedence
    const mergedColors = { ...existingColors, ...newColors };

    await config.update(
        'colorCustomizations',
        mergedColors,
        vscode.ConfigurationTarget.Workspace
    );
}

/**
 * Removes specific color customizations from the workbench.
 */
async function removeColorCustomizations(
    workspaceFolder: vscode.WorkspaceFolder,
    keysToRemove: string[]
): Promise<void> {
    const config = vscode.workspace.getConfiguration('workbench', workspaceFolder.uri);
    const existingColors = await getExistingColorCustomizations(workspaceFolder);

    // Remove the specified keys
    const filteredColors = { ...existingColors };
    for (const key of keysToRemove) {
        delete filteredColors[key];
    }

    // If no colors left, set to undefined to clean up
    const hasColors = Object.keys(filteredColors).length > 0;

    await config.update(
        'colorCustomizations',
        hasColors ? filteredColors : undefined,
        vscode.ConfigurationTarget.Workspace
    );
}

/**
 * Builds the color customizations object from a palette and config.
 */
export function buildColorCustomizations(
    palette: ColorPalette,
    config: ProjectColorConfig
): Record<string, string> {
    const colors: Record<string, string> = {};

    if (config.colorTitleBar) {
        const titleBarColors = adjustPaletteForContext(palette, 'titleBar');
        colors[COLOR_KEYS.titleBar.background] = titleBarColors.background;
        colors[COLOR_KEYS.titleBar.foreground] = titleBarColors.foreground;
        colors[COLOR_KEYS.titleBar.inactiveBackground] = titleBarColors.background;
        colors[COLOR_KEYS.titleBar.inactiveForeground] = titleBarColors.foreground + '99'; // Add alpha for inactive
    }

    if (config.colorActivityBar) {
        const activityBarColors = adjustPaletteForContext(palette, 'activityBar');
        colors[COLOR_KEYS.activityBar.background] = activityBarColors.background;
        colors[COLOR_KEYS.activityBar.foreground] = activityBarColors.foreground;
        colors[COLOR_KEYS.activityBar.inactiveForeground] = activityBarColors.foreground + '99';
        colors[COLOR_KEYS.activityBar.activeBorder] = activityBarColors.foreground;
    }

    if (config.colorStatusBar) {
        const statusBarColors = adjustPaletteForContext(palette, 'statusBar');
        colors[COLOR_KEYS.statusBar.background] = statusBarColors.background;
        colors[COLOR_KEYS.statusBar.foreground] = statusBarColors.foreground;
        // Keep debugging/no-folder backgrounds similar but slightly different
        colors[COLOR_KEYS.statusBar.noFolderBackground] = palette.darkened;
    }

    if (config.colorTabBar) {
        const tabBarColors = adjustPaletteForContext(palette, 'tabBar');
        colors[COLOR_KEYS.tabBar.activeBackground] = tabBarColors.background;
        colors[COLOR_KEYS.tabBar.activeForeground] = tabBarColors.foreground;
        colors[COLOR_KEYS.tabBar.activeBorderTop] = palette.primary;
    }

    if (config.colorSideBar) {
        const sideBarColors = adjustPaletteForContext(palette, 'sideBar');
        colors[COLOR_KEYS.sideBar.background] = sideBarColors.background;
        colors[COLOR_KEYS.sideBar.foreground] = sideBarColors.foreground;
    }

    // Always apply focus border for consistent accent
    colors[COLOR_KEYS.misc.focusBorder] = palette.primary;

    return colors;
}

/**
 * Gets all the color keys that might be applied by this extension.
 */
export function getAllManagedColorKeys(): string[] {
    const keys: string[] = [];

    for (const group of Object.values(COLOR_KEYS)) {
        for (const key of Object.values(group)) {
            keys.push(key);
        }
    }

    return keys;
}

/**
 * Applies project colors to the VS Code UI.
 */
export async function applyColors(
    workspaceFolder: vscode.WorkspaceFolder,
    palette: ColorPalette,
    iconPath: string | null
): Promise<ApplyResult> {
    try {
        const config = getConfig(workspaceFolder);
        const stateManager = getStateManager();

        // Store current colors before applying new ones (for revert)
        const existingColors = await getExistingColorCustomizations(workspaceFolder);

        // Only store if we haven't already stored (avoid overwriting original with our colors)
        if (!stateManager.hasAppliedColors(workspaceFolder)) {
            // Filter to only store keys we manage
            const managedKeys = getAllManagedColorKeys();
            const relevantExisting: Record<string, string> = {};
            for (const key of managedKeys) {
                if (existingColors[key]) {
                    relevantExisting[key] = existingColors[key];
                }
            }
            await stateManager.storePreviousColors(workspaceFolder,
                Object.keys(relevantExisting).length > 0 ? relevantExisting : null
            );
        }

        // Remove all managed color keys first (to clear any previously colored sections that are now disabled)
        const managedKeys = getAllManagedColorKeys();
        await removeColorCustomizations(workspaceFolder, managedKeys);

        // Build and apply new colors
        const newColors = buildColorCustomizations(palette, config);
        await setColorCustomizations(workspaceFolder, newColors);

        // Mark colors as applied
        await stateManager.markColorsApplied(workspaceFolder, palette.primary, iconPath);

        const appliedKeys = Object.keys(newColors);
        log(`Applied ${appliedKeys.length} color customizations to ${workspaceFolder.name}`);

        return {
            success: true,
            appliedKeys
        };
    } catch (error) {
        logError(`Failed to apply colors to ${workspaceFolder.name}`, error);
        return {
            success: false,
            appliedKeys: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Reverts colors to their previous state.
 */
export async function revertColors(workspaceFolder: vscode.WorkspaceFolder): Promise<ApplyResult> {
    try {
        const stateManager = getStateManager();
        const previousColors = stateManager.getPreviousColors(workspaceFolder);

        // Get all keys we might have set
        const managedKeys = getAllManagedColorKeys();

        if (previousColors && Object.keys(previousColors).length > 0) {
            // Remove our colors and restore previous
            await removeColorCustomizations(workspaceFolder, managedKeys);

            // Re-apply the previous colors
            const config = vscode.workspace.getConfiguration('workbench', workspaceFolder.uri);
            const currentColors = await getExistingColorCustomizations(workspaceFolder);
            const restoredColors = { ...currentColors, ...previousColors };

            await config.update(
                'colorCustomizations',
                restoredColors,
                vscode.ConfigurationTarget.Workspace
            );

            log(`Restored previous colors for ${workspaceFolder.name}`);
        } else {
            // No previous colors, just remove our customizations
            await removeColorCustomizations(workspaceFolder, managedKeys);
            log(`Removed color customizations for ${workspaceFolder.name}`);
        }

        // Clear the current color state
        await stateManager.clearCurrentColors(workspaceFolder);

        return {
            success: true,
            appliedKeys: managedKeys
        };
    } catch (error) {
        logError(`Failed to revert colors for ${workspaceFolder.name}`, error);
        return {
            success: false,
            appliedKeys: [],
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
}

/**
 * Checks if colors are currently applied to a workspace.
 */
export function hasAppliedColors(workspaceFolder: vscode.WorkspaceFolder): boolean {
    const stateManager = getStateManager();
    return stateManager.hasAppliedColors(workspaceFolder);
}

/**
 * Gets the currently applied color for a workspace.
 */
export function getCurrentColor(workspaceFolder: vscode.WorkspaceFolder): string | null {
    const stateManager = getStateManager();
    return stateManager.getCurrentColor(workspaceFolder);
}
