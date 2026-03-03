import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { revertColors, hasAppliedColors } from '../ui/uiApplier';
import { updateStatusBar } from '../ui/statusBar';
import { log } from '../utils/logger';

/**
 * Reverts colors to the state before Auto Project Colors was applied.
 */
export async function revertProjectColors(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    if (!hasAppliedColors(folder)) {
        vscode.window.showInformationMessage('No project colors have been applied to revert.');
        return;
    }

    log(`Reverting colors for ${folder.name}`);

    const result = await revertColors(folder);

    if (result.success) {
        updateStatusBar();
        vscode.window.showInformationMessage('Project colors reverted successfully.');
        log(`Successfully reverted colors for ${folder.name}`);
    } else {
        vscode.window.showErrorMessage(`Failed to revert colors: ${result.error}`);
    }
}

/**
 * Registers the revert command.
 */
export function registerRevertCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.revert', async () => {
        await revertProjectColors();
    });
}
