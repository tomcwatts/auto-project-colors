import * as vscode from 'vscode';
import { log, logError } from '../utils/logger';

export interface WorkspaceColorState {
    previousColors: Record<string, string> | null;
    currentColor: string | null;
    iconPath: string | null;
    appliedAt: number | null;
    enabled: boolean;
}

const STATE_KEY = 'projectColorState';

/**
 * Manages persistent state for the extension.
 * Stores previous colors for revert functionality and tracks current state.
 */
export class StateManager {
    private context: vscode.ExtensionContext;

    constructor(context: vscode.ExtensionContext) {
        this.context = context;
    }

    /**
     * Gets the state for a specific workspace folder.
     */
    getState(workspaceFolder: vscode.WorkspaceFolder): WorkspaceColorState {
        const key = this.getStateKey(workspaceFolder);
        const state = this.context.workspaceState.get<WorkspaceColorState>(key);

        return state ?? {
            previousColors: null,
            currentColor: null,
            iconPath: null,
            appliedAt: null,
            enabled: true
        };
    }

    /**
     * Saves the state for a specific workspace folder.
     */
    async setState(
        workspaceFolder: vscode.WorkspaceFolder,
        state: Partial<WorkspaceColorState>
    ): Promise<void> {
        const key = this.getStateKey(workspaceFolder);
        const currentState = this.getState(workspaceFolder);
        const newState = { ...currentState, ...state };

        try {
            await this.context.workspaceState.update(key, newState);
            log(`State saved for ${workspaceFolder.name}`);
        } catch (error) {
            logError(`Failed to save state for ${workspaceFolder.name}`, error);
        }
    }

    /**
     * Stores the previous color customizations before applying new ones.
     */
    async storePreviousColors(
        workspaceFolder: vscode.WorkspaceFolder,
        colors: Record<string, string> | null
    ): Promise<void> {
        await this.setState(workspaceFolder, { previousColors: colors });
    }

    /**
     * Gets the previously stored colors.
     */
    getPreviousColors(workspaceFolder: vscode.WorkspaceFolder): Record<string, string> | null {
        return this.getState(workspaceFolder).previousColors;
    }

    /**
     * Marks colors as applied with the given color and icon path.
     */
    async markColorsApplied(
        workspaceFolder: vscode.WorkspaceFolder,
        color: string,
        iconPath: string | null
    ): Promise<void> {
        await this.setState(workspaceFolder, {
            currentColor: color,
            iconPath,
            appliedAt: Date.now()
        });
    }

    /**
     * Gets the current applied color.
     */
    getCurrentColor(workspaceFolder: vscode.WorkspaceFolder): string | null {
        return this.getState(workspaceFolder).currentColor;
    }

    /**
     * Gets the current icon path.
     */
    getIconPath(workspaceFolder: vscode.WorkspaceFolder): string | null {
        return this.getState(workspaceFolder).iconPath;
    }

    /**
     * Checks if colors have been applied to this workspace.
     */
    hasAppliedColors(workspaceFolder: vscode.WorkspaceFolder): boolean {
        const state = this.getState(workspaceFolder);
        return state.currentColor !== null && state.appliedAt !== null;
    }

    /**
     * Clears the current color state (after revert).
     */
    async clearCurrentColors(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        await this.setState(workspaceFolder, {
            currentColor: null,
            iconPath: null,
            appliedAt: null
        });
    }

    /**
     * Sets the enabled state for the workspace.
     */
    async setEnabled(workspaceFolder: vscode.WorkspaceFolder, enabled: boolean): Promise<void> {
        await this.setState(workspaceFolder, { enabled });
    }

    /**
     * Checks if the extension is enabled for this workspace.
     */
    isEnabled(workspaceFolder: vscode.WorkspaceFolder): boolean {
        return this.getState(workspaceFolder).enabled;
    }

    /**
     * Clears all state for a workspace.
     */
    async clearState(workspaceFolder: vscode.WorkspaceFolder): Promise<void> {
        const key = this.getStateKey(workspaceFolder);
        await this.context.workspaceState.update(key, undefined);
        log(`State cleared for ${workspaceFolder.name}`);
    }

    /**
     * Gets a unique key for storing workspace state.
     */
    private getStateKey(workspaceFolder: vscode.WorkspaceFolder): string {
        return `${STATE_KEY}_${workspaceFolder.uri.fsPath}`;
    }
}

// Singleton instance, initialized in extension activate
let stateManager: StateManager | undefined;

export function initStateManager(context: vscode.ExtensionContext): StateManager {
    stateManager = new StateManager(context);
    return stateManager;
}

export function getStateManager(): StateManager {
    if (!stateManager) {
        throw new Error('StateManager not initialized. Call initStateManager first.');
    }
    return stateManager;
}
