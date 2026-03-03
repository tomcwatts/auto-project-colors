import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { getCurrentColor, hasAppliedColors } from './uiApplier';
import { log } from '../utils/logger';

let statusBarItem: vscode.StatusBarItem | undefined;

/**
 * Creates and returns the status bar item.
 */
export function createStatusBarItem(): vscode.StatusBarItem {
    if (statusBarItem) {
        return statusBarItem;
    }

    statusBarItem = vscode.window.createStatusBarItem(
        vscode.StatusBarAlignment.Right,
        100
    );

    statusBarItem.command = 'projectColor.showStatus';
    statusBarItem.tooltip = 'Auto Project Colors: Click to manage';

    return statusBarItem;
}

/**
 * Updates the status bar item to reflect current state.
 */
export function updateStatusBar(): void {
    if (!statusBarItem) {
        return;
    }

    const workspaceFolder = getWorkspaceFolder();

    if (!workspaceFolder) {
        statusBarItem.hide();
        return;
    }

    const currentColor = getCurrentColor(workspaceFolder);

    if (currentColor && hasAppliedColors(workspaceFolder)) {
        // Show the color indicator
        statusBarItem.text = '$(paintcan)';
        statusBarItem.tooltip = `Auto Project Colors: ${currentColor}\nWorkspace: ${workspaceFolder.name}\nClick to manage`;
        statusBarItem.backgroundColor = undefined;
        statusBarItem.show();
        log(`Status bar updated: ${currentColor}`);
    } else {
        // Show inactive state
        statusBarItem.text = '$(paintcan)';
        statusBarItem.tooltip = 'Auto Project Colors: Not applied\nClick to apply';
        statusBarItem.show();
    }
}

/**
 * Hides the status bar item.
 */
export function hideStatusBar(): void {
    if (statusBarItem) {
        statusBarItem.hide();
    }
}

/**
 * Disposes the status bar item.
 */
export function disposeStatusBar(): void {
    if (statusBarItem) {
        statusBarItem.dispose();
        statusBarItem = undefined;
    }
}

/**
 * Gets the status bar item instance.
 */
export function getStatusBarItem(): vscode.StatusBarItem | undefined {
    return statusBarItem;
}
