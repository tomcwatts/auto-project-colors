import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { getConfig } from '../utils/config';
import { hasAppliedColors, getCurrentColor } from '../ui/uiApplier';
import { showOutputChannel, log } from '../utils/logger';

interface StatusQuickPickItem extends vscode.QuickPickItem {
    action: 'apply' | 'revert' | 'pick' | 'regenerate' | 'disable' | 'enable' | 'showLogs' | 'chooseUISections';
}

/**
 * Shows the current status and quick actions for Auto Project Colors.
 */
export async function showProjectColorStatus(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const config = getConfig(folder);
    const currentColor = getCurrentColor(folder);
    const hasColors = hasAppliedColors(folder);

    // Build status message
    let statusMessage = '';
    if (!config.enabled) {
        statusMessage = '$(circle-slash) Disabled';
    } else if (hasColors && currentColor) {
        statusMessage = `$(check) Active: ${currentColor}`;
    } else {
        statusMessage = '$(circle-outline) Not applied';
    }

    // Build quick pick options
    const options: StatusQuickPickItem[] = [];

    if (config.enabled) {
        if (hasColors) {
            options.push({
                label: '$(refresh) Regenerate with Different Strategy',
                description: 'Change the color palette strategy',
                action: 'regenerate'
            });
            options.push({
                label: '$(discard) Revert to Previous Colors',
                description: 'Remove project color customizations',
                action: 'revert'
            });
        } else {
            options.push({
                label: '$(play) Apply Auto Project Colors',
                description: 'Detect favicon and apply colors',
                action: 'apply'
            });
        }

        options.push({
            label: '$(file-media) Pick Icon File Manually',
            description: 'Select a custom icon file',
            action: 'pick'
        });

        options.push({
            label: '$(layout) Choose UI Sections to Color',
            description: 'Select which parts of VS Code to color',
            action: 'chooseUISections'
        });

        options.push({
            label: '$(circle-slash) Disable for This Workspace',
            description: 'Turn off Auto Project Colors',
            action: 'disable'
        });
    } else {
        options.push({
            label: '$(check) Enable Auto Project Colors',
            description: 'Turn on Auto Project Colors for this workspace',
            action: 'enable'
        });
    }

    options.push({
        label: '$(output) Show Output Logs',
        description: 'View extension logs for troubleshooting',
        action: 'showLogs'
    });

    // Show current status in the title
    const selected = await vscode.window.showQuickPick(options, {
        placeHolder: statusMessage,
        title: `Auto Project Colors - ${folder.name}`
    });

    if (!selected) {
        return;
    }

    // Execute selected action
    switch (selected.action) {
        case 'apply':
            await vscode.commands.executeCommand('projectColor.apply');
            break;
        case 'revert':
            await vscode.commands.executeCommand('projectColor.revert');
            break;
        case 'pick':
            await vscode.commands.executeCommand('projectColor.pickIcon');
            break;
        case 'regenerate':
            await vscode.commands.executeCommand('projectColor.regenerate');
            break;
        case 'disable':
            await vscode.commands.executeCommand('projectColor.disable');
            break;
        case 'enable':
            await vscode.commands.executeCommand('projectColor.disable'); // Toggles
            break;
        case 'chooseUISections':
            await vscode.commands.executeCommand('projectColor.chooseUISections');
            break;
        case 'showLogs':
            showOutputChannel();
            break;
    }

    log(`Status action executed: ${selected.action}`);
}

/**
 * Registers the show status command.
 */
export function registerShowStatusCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.showStatus', async () => {
        await showProjectColorStatus();
    });
}
