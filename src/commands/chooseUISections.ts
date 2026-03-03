import * as vscode from 'vscode';
import { getWorkspaceFolder } from '../utils/fileHelpers';
import { getConfig, UISectionsPreset, UI_PRESETS, detectCurrentPreset } from '../utils/config';
import { hasAppliedColors } from '../ui/uiApplier';
import { log } from '../utils/logger';

interface PresetQuickPickItem extends vscode.QuickPickItem {
    preset: UISectionsPreset;
}

const PRESET_OPTIONS: PresetQuickPickItem[] = [
    {
        label: '$(circle-outline) Minimal',
        description: 'Title bar only - least distraction',
        preset: 'minimal'
    },
    {
        label: '$(list-selection) Balanced',
        description: 'Title + Activity + Status bars - good balance (default)',
        preset: 'balanced'
    },
    {
        label: '$(split-vertical) Top & Bottom',
        description: 'Title + Status bars - clear window borders',
        preset: 'topBottom'
    },
    {
        label: '$(paintcan) Maximum',
        description: 'All sections - full color immersion',
        preset: 'maximum'
    }
];

/**
 * Allows user to choose a UI sections preset.
 */
export async function chooseUISectionsPreset(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open.');
        return;
    }

    const config = getConfig(folder);
    const currentPreset = detectCurrentPreset(config);

    // Sort options to put current first
    const sortedOptions = [...PRESET_OPTIONS].sort((a, b) => {
        if (a.preset === currentPreset) {
            return -1;
        }
        if (b.preset === currentPreset) {
            return 1;
        }
        return 0;
    });

    // Mark current preset
    if (currentPreset !== 'custom') {
        sortedOptions[0] = {
            ...sortedOptions[0],
            label: sortedOptions[0].label + ' (current)',
            picked: true
        };
    } else {
        // Add custom option at the end if currently custom
        sortedOptions.push({
            label: '$(wrench) Custom',
            description: 'User-defined - manually configured in settings',
            preset: 'custom',
            picked: true
        });
    }

    const selectedOption = await vscode.window.showQuickPick(sortedOptions, {
        placeHolder: 'Select which UI sections to color',
        title: 'Choose UI Sections Preset'
    });

    if (!selectedOption) {
        return; // User cancelled
    }

    const newPreset = selectedOption.preset;

    if (newPreset === 'custom') {
        // Open settings to let user configure manually
        vscode.commands.executeCommand('workbench.action.openSettings', '@ext:tomwatts.auto-project-colors colorTitleBar');
        return;
    }

    log(`Applying UI sections preset: ${newPreset}`);

    // Apply the preset by updating all 5 flags atomically
    const presetConfig = UI_PRESETS[newPreset];
    const configuration = vscode.workspace.getConfiguration('projectColor', folder.uri);

    try {
        await Promise.all([
            configuration.update('colorTitleBar', presetConfig.colorTitleBar, vscode.ConfigurationTarget.Workspace),
            configuration.update('colorActivityBar', presetConfig.colorActivityBar, vscode.ConfigurationTarget.Workspace),
            configuration.update('colorStatusBar', presetConfig.colorStatusBar, vscode.ConfigurationTarget.Workspace),
            configuration.update('colorTabBar', presetConfig.colorTabBar, vscode.ConfigurationTarget.Workspace),
            configuration.update('colorSideBar', presetConfig.colorSideBar, vscode.ConfigurationTarget.Workspace)
        ]);

        // Trigger re-application of colors if already applied
        if (hasAppliedColors(folder)) {
            await vscode.commands.executeCommand('projectColor.regenerate');
        }

        vscode.window.showInformationMessage(`Applied "${newPreset}" UI sections preset`);
        log(`Successfully applied preset: ${newPreset}`);
    } catch (error) {
        vscode.window.showErrorMessage(`Failed to apply preset: ${error}`);
    }
}

/**
 * Registers the choose UI sections command.
 */
export function registerChooseUISectionsCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.chooseUISections', async () => {
        await chooseUISectionsPreset();
    });
}
