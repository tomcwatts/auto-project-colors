import * as vscode from 'vscode';

export type PaletteStrategy = 'dominant' | 'vibrant' | 'muted' | 'pastel';
export type IconSourceMode = 'auto' | 'manual';
export type UISectionsPreset = 'minimal' | 'balanced' | 'topBottom' | 'maximum' | 'custom';

export interface UIPresetDefinition {
    colorTitleBar: boolean;
    colorActivityBar: boolean;
    colorStatusBar: boolean;
    colorTabBar: boolean;
    colorSideBar: boolean;
}

export interface ProjectColorConfig {
    enabled: boolean;
    iconSourceMode: IconSourceMode;
    iconPath: string;
    iconSearchPatterns: string[];
    paletteStrategy: PaletteStrategy;
    contrastTarget: number;
    colorTitleBar: boolean;
    colorActivityBar: boolean;
    colorStatusBar: boolean;
    colorTabBar: boolean;
    colorSideBar: boolean;
    notifyOnApply: boolean;
    maxImageSize: number;
    enableAutomaticDetection: boolean;
}

const DEFAULT_CONFIG: ProjectColorConfig = {
    enabled: true,
    iconSourceMode: 'auto',
    iconPath: '',
    iconSearchPatterns: [
        'favicon.ico',
        'favicon.png',
        'favicon.svg',
        'public/favicon.ico',
        'public/favicon.png',
        'public/favicon.svg',
        'public/icon.png',
        'app/favicon.ico',
        'app/favicon.png',
        'assets/favicon.ico',
        'assets/favicon.png',
        'assets/icon.png',
        'assets/app-icon.png',
        'src/assets/favicon.png',
        'src/assets/icon.png',
        'static/favicon.ico',
        'static/favicon.png',
        'resources/favicon.ico',
        'resources/icon.png',
        'app/assets/images/favicon.ico',
        'ios/*/Images.xcassets/AppIcon.appiconset/Icon-App-76x76@2x.png'
    ],
    paletteStrategy: 'dominant',
    contrastTarget: 4.5,
    colorTitleBar: true,
    colorActivityBar: true,
    colorStatusBar: true,
    colorTabBar: false,
    colorSideBar: false,
    notifyOnApply: true,
    maxImageSize: 5242880,
    enableAutomaticDetection: true
};

export function getConfig(workspaceFolder?: vscode.WorkspaceFolder): ProjectColorConfig {
    const config = vscode.workspace.getConfiguration('projectColor', workspaceFolder?.uri);

    return {
        enabled: config.get<boolean>('enabled', DEFAULT_CONFIG.enabled),
        iconSourceMode: config.get<IconSourceMode>('iconSourceMode', DEFAULT_CONFIG.iconSourceMode),
        iconPath: config.get<string>('iconPath', DEFAULT_CONFIG.iconPath),
        iconSearchPatterns: config.get<string[]>('iconSearchPatterns', DEFAULT_CONFIG.iconSearchPatterns),
        paletteStrategy: config.get<PaletteStrategy>('paletteStrategy', DEFAULT_CONFIG.paletteStrategy),
        contrastTarget: config.get<number>('contrastTarget', DEFAULT_CONFIG.contrastTarget),
        colorTitleBar: config.get<boolean>('colorTitleBar', DEFAULT_CONFIG.colorTitleBar),
        colorActivityBar: config.get<boolean>('colorActivityBar', DEFAULT_CONFIG.colorActivityBar),
        colorStatusBar: config.get<boolean>('colorStatusBar', DEFAULT_CONFIG.colorStatusBar),
        colorTabBar: config.get<boolean>('colorTabBar', DEFAULT_CONFIG.colorTabBar),
        colorSideBar: config.get<boolean>('colorSideBar', DEFAULT_CONFIG.colorSideBar),
        notifyOnApply: config.get<boolean>('notifyOnApply', DEFAULT_CONFIG.notifyOnApply),
        maxImageSize: config.get<number>('maxImageSize', DEFAULT_CONFIG.maxImageSize),
        enableAutomaticDetection: config.get<boolean>('enableAutomaticDetection', DEFAULT_CONFIG.enableAutomaticDetection)
    };
}

export async function updateConfig<K extends keyof ProjectColorConfig>(
    key: K,
    value: ProjectColorConfig[K],
    workspaceFolder?: vscode.WorkspaceFolder
): Promise<void> {
    const config = vscode.workspace.getConfiguration('projectColor', workspaceFolder?.uri);
    await config.update(key, value, vscode.ConfigurationTarget.WorkspaceFolder);
}

/**
 * UI Sections Preset Definitions
 */
export const UI_PRESETS: Record<UISectionsPreset, UIPresetDefinition> = {
    minimal: {
        colorTitleBar: true,
        colorActivityBar: false,
        colorStatusBar: false,
        colorTabBar: false,
        colorSideBar: false
    },
    balanced: {
        colorTitleBar: true,
        colorActivityBar: true,
        colorStatusBar: true,
        colorTabBar: false,
        colorSideBar: false
    },
    topBottom: {
        colorTitleBar: true,
        colorActivityBar: false,
        colorStatusBar: true,
        colorTabBar: false,
        colorSideBar: false
    },
    maximum: {
        colorTitleBar: true,
        colorActivityBar: true,
        colorStatusBar: true,
        colorTabBar: true,
        colorSideBar: true
    },
    custom: {
        // Placeholder - custom means user-defined
        colorTitleBar: true,
        colorActivityBar: true,
        colorStatusBar: true,
        colorTabBar: false,
        colorSideBar: false
    }
};

/**
 * Detects which preset is currently active based on config flags.
 * Returns 'custom' if the flags don't match any preset.
 */
export function detectCurrentPreset(config: ProjectColorConfig): UISectionsPreset {
    const currentFlags = {
        colorTitleBar: config.colorTitleBar,
        colorActivityBar: config.colorActivityBar,
        colorStatusBar: config.colorStatusBar,
        colorTabBar: config.colorTabBar,
        colorSideBar: config.colorSideBar
    };

    // Check if current flags match any preset
    for (const [presetName, presetFlags] of Object.entries(UI_PRESETS)) {
        if (presetName === 'custom') {
            continue;
        }

        if (
            currentFlags.colorTitleBar === presetFlags.colorTitleBar &&
            currentFlags.colorActivityBar === presetFlags.colorActivityBar &&
            currentFlags.colorStatusBar === presetFlags.colorStatusBar &&
            currentFlags.colorTabBar === presetFlags.colorTabBar &&
            currentFlags.colorSideBar === presetFlags.colorSideBar
        ) {
            return presetName as UISectionsPreset;
        }
    }

    return 'custom';
}
