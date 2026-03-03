import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { getConfig, updateConfig } from '../utils/config';
import { revertColors, hasAppliedColors } from '../ui/uiApplier';
import { updateStatusBar } from '../ui/statusBar';
import { log } from '../utils/logger';

/**
 * Disables Auto Project Colors for the current workspace.
 */
export async function disableForWorkspace(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const config = getConfig(folder);

    if (!config.enabled) {
        // Already disabled, offer to enable
        const choice = await vscode.window.showInformationMessage(
            'Auto Project Colors is already disabled for this workspace. Would you like to enable it?',
            'Enable',
            'Cancel'
        );

        if (choice === 'Enable') {
            await updateConfig('enabled', true, folder);
            vscode.window.showInformationMessage('Auto Project Colors enabled for this workspace.');
            log(`Enabled Auto Project Colors for ${folder.name}`);
        }
        return;
    }

    // Disable the extension
    await updateConfig('enabled', false, folder);

    // If colors were applied, offer to revert
    if (hasAppliedColors(folder)) {
        const choice = await vscode.window.showInformationMessage(
            'Auto Project Colors has been disabled. Would you like to revert the applied colors?',
            'Revert Colors',
            'Keep Colors'
        );

        if (choice === 'Revert Colors') {
            const result = await revertColors(folder);
            if (result.success) {
                vscode.window.showInformationMessage('Colors reverted and Auto Project Colors disabled.');
            }
        } else {
            vscode.window.showInformationMessage('Auto Project Colors disabled. Colors will remain until manually changed.');
        }
    } else {
        vscode.window.showInformationMessage('Auto Project Colors disabled for this workspace.');
    }

    updateStatusBar();
    log(`Disabled Auto Project Colors for ${folder.name}`);
}

/**
 * Registers the disable command.
 */
export function registerDisableCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.disable', async () => {
        await disableForWorkspace();
    });
}
