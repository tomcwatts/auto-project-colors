import * as vscode from 'vscode';
import { registerApplyCommand } from './apply';
import { registerPickIconCommand } from './pickIcon';
import { registerRevertCommand } from './revert';
import { registerDisableCommand } from './disable';
import { registerRegenerateCommand } from './regenerate';
import { registerShowStatusCommand } from './showStatus';
import { registerSetCustomHexCommand } from './setCustomHex';
import { registerChooseUISectionsCommand } from './chooseUISections';

/**
 * Registers all extension commands.
 */
export function registerAllCommands(context: vscode.ExtensionContext): void {
    context.subscriptions.push(
        registerApplyCommand(context),
        registerPickIconCommand(context),
        registerRevertCommand(context),
        registerDisableCommand(context),
        registerRegenerateCommand(context),
        registerShowStatusCommand(context),
        registerSetCustomHexCommand(context),
        registerChooseUISectionsCommand(context)
    );
}

// Re-export individual command functions for direct use
export { applyProjectColor } from './apply';
export { pickIconFile } from './pickIcon';
export { revertProjectColors } from './revert';
export { disableForWorkspace } from './disable';
export { regenerateWithStrategy } from './regenerate';
export { showProjectColorStatus } from './showStatus';
export { setCustomHexCommand } from './setCustomHex';
export { chooseUISectionsPreset } from './chooseUISections';
