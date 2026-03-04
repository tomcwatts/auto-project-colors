import * as vscode from 'vscode';
import { getConfig, ProjectColorConfig } from '../utils/config';
import { ColorPalette, adjustPaletteForContext } from '../colors/colorGenerator';
import { ensureDarkBackground, ensureIconContrast } from '../utils/colorValidation';
import { getStateManager } from './stateManager';
import { log, logError } from '../utils/logger';
import { getGitDir, isGitIgnored, isGitTracked, addToGitExclude } from '../utils/gitHelpers';

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
        activeBorder: 'activityBar.activeBorder',
        badgeBackground: 'activityBarBadge.background',
        badgeForeground: 'activityBarBadge.foreground'
    },
    statusBar: {
        background: 'statusBar.background',
        foreground: 'statusBar.foreground',
        noFolderBackground: 'statusBar.noFolderBackground',
        debuggingBackground: 'statusBar.debuggingBackground',
        remoteBackground: 'statusBarItem.remoteBackground',
        remoteForeground: 'statusBarItem.remoteForeground'
    },
    tabBar: {
        activeBackground: 'tab.activeBackground',
        activeForeground: 'tab.activeForeground',
        activeBorder: 'tab.activeBorder',
        activeBorderTop: 'tab.activeBorderTop'
    },
    sideBar: {
        background: 'sideBar.background',
        foreground: 'sideBar.foreground',
        titleForeground: 'sideBarTitle.foreground',
        sectionHeaderForeground: 'sideBarSectionHeader.foreground',
        iconForeground: 'icon.foreground',
        listActiveSelectionForeground: 'list.activeSelectionForeground',
        listInactiveSelectionForeground: 'list.inactiveSelectionForeground',
        listHoverForeground: 'list.hoverForeground',
        listFocusForeground: 'list.focusForeground',
        listFocusHighlightForeground: 'list.focusHighlightForeground'
    },
    misc: {
        focusBorder: 'focusBorder'
    }
};

const DARK_BACKGROUND_CONTRAST_TARGET = 7;
const FOREGROUND_BASE = '#ffffff';
const INACTIVE_FOREGROUND_BASE = '#ffffff99';

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
        const titleBarBackground = ensureDarkBackground(
            titleBarColors.background,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.titleBar.background] = titleBarBackground;
        colors[COLOR_KEYS.titleBar.foreground] = ensureIconContrast(
            FOREGROUND_BASE,
            titleBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.titleBar.inactiveBackground] = titleBarBackground;
        colors[COLOR_KEYS.titleBar.inactiveForeground] = ensureIconContrast(
            INACTIVE_FOREGROUND_BASE,
            titleBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
    }

    if (config.colorActivityBar) {
        const activityBarColors = adjustPaletteForContext(palette, 'activityBar');
        const activityBarBackground = ensureDarkBackground(
            activityBarColors.background,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        const activityBarForeground = ensureIconContrast(
            FOREGROUND_BASE,
            activityBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        const activityBarInactiveForeground = ensureIconContrast(
            INACTIVE_FOREGROUND_BASE,
            activityBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.activityBar.background] = activityBarBackground;
        colors[COLOR_KEYS.activityBar.foreground] = activityBarForeground;
        colors[COLOR_KEYS.activityBar.inactiveForeground] = activityBarInactiveForeground;
        colors[COLOR_KEYS.activityBar.activeBorder] = activityBarForeground;
        colors[COLOR_KEYS.activityBar.badgeBackground] = activityBarBackground;
        colors[COLOR_KEYS.activityBar.badgeForeground] = activityBarForeground;
    }

    if (config.colorStatusBar) {
        const statusBarColors = adjustPaletteForContext(palette, 'statusBar');
        const statusBarBackground = ensureDarkBackground(
            statusBarColors.background,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        const statusBarForeground = ensureIconContrast(
            FOREGROUND_BASE,
            statusBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.statusBar.background] = statusBarBackground;
        colors[COLOR_KEYS.statusBar.foreground] = statusBarForeground;
        // Keep debugging/no-folder backgrounds similar but slightly different
        colors[COLOR_KEYS.statusBar.noFolderBackground] = ensureDarkBackground(
            palette.darkened,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.statusBar.remoteBackground] = statusBarBackground;
        colors[COLOR_KEYS.statusBar.remoteForeground] = statusBarForeground;
    }

    if (config.colorTabBar) {
        const tabBarColors = adjustPaletteForContext(palette, 'tabBar');
        const tabBarBackground = ensureDarkBackground(
            tabBarColors.background,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        const tabBarForeground = ensureIconContrast(
            FOREGROUND_BASE,
            tabBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.tabBar.activeBackground] = tabBarBackground;
        colors[COLOR_KEYS.tabBar.activeForeground] = tabBarForeground;
        colors[COLOR_KEYS.tabBar.activeBorderTop] = tabBarForeground;
    }

    if (config.colorSideBar) {
        const sideBarColors = adjustPaletteForContext(palette, 'sideBar');
        const sideBarBackground = ensureDarkBackground(
            sideBarColors.background,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        const sideBarForeground = ensureIconContrast(
            FOREGROUND_BASE,
            sideBarBackground,
            DARK_BACKGROUND_CONTRAST_TARGET
        );
        colors[COLOR_KEYS.sideBar.background] = sideBarBackground;
        colors[COLOR_KEYS.sideBar.foreground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.titleForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.sectionHeaderForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.iconForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.listActiveSelectionForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.listInactiveSelectionForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.listHoverForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.listFocusForeground] = sideBarForeground;
        colors[COLOR_KEYS.sideBar.listFocusHighlightForeground] = sideBarForeground;
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
 * Ensures .vscode/settings.json won't dirty git status.
 * Adds to .git/info/exclude if: git repo + not ignored + not tracked.
 */
async function ensureGitExclusion(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
    const workspacePath = workspaceFolder.uri.fsPath;
    const settingsRelPath = '.vscode/settings.json';

    try {
        const gitDir = await getGitDir(workspacePath);
        if (!gitDir) { return; }

        if (await isGitIgnored(workspacePath, settingsRelPath)) { return; }
        if (await isGitTracked(workspacePath, settingsRelPath)) { return; }

        const added = await addToGitExclude(gitDir, settingsRelPath);
        if (added) {
            log(`Added ${settingsRelPath} to .git/info/exclude to keep git status clean`);
        }
    } catch (error) {
        log(`Could not configure git exclusion: ${error}`);
    }
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

        // Fire-and-forget: ensure .vscode/settings.json is excluded from git
        ensureGitExclusion(workspaceFolder).catch(err =>
            log(`Git exclusion check failed: ${err}`)
        );

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
