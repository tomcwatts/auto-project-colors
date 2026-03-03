import * as vscode from 'vscode';
import { initStateManager } from './ui/stateManager';
import { registerAllCommands, applyProjectColor } from './commands';
import { createStatusBarItem, updateStatusBar, disposeStatusBar } from './ui/statusBar';
import { getConfig } from './utils/config';
import { getWorkspaceFolder, getAllWorkspaceFolders } from './utils/fileHelpers';
import { log, logError, disposeLogger } from './utils/logger';
import { hasAppliedColors } from './ui/uiApplier';
import { clearDetectionCaches } from './icons/iconFinder';

let fileWatcher: vscode.FileSystemWatcher | undefined;
let configChangeDisposable: vscode.Disposable | undefined;
let workspaceChangeDisposable: vscode.Disposable | undefined;
let debounceTimer: ReturnType<typeof setTimeout> | undefined;

const DEBOUNCE_DELAY = 500; // ms

/**
 * Debounced function to re-apply colors when favicon changes.
 */
function debounceApplyColors(folder: vscode.WorkspaceFolder): void {
    if (debounceTimer) {
        clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(async () => {
        const config = getConfig(folder);
        if (config.enabled && config.enableAutomaticDetection) {
            log(`Favicon changed, re-applying colors for ${folder.name}`);
            await applyProjectColor(folder);
        }
    }, DEBOUNCE_DELAY);
}

/**
 * Sets up file watcher for favicon changes.
 */
function setupFileWatcher(context: vscode.ExtensionContext): void {
    // Watch for favicon files in the workspace
    const faviconPattern = '**/favicon.{ico,png,svg}';

    fileWatcher = vscode.workspace.createFileSystemWatcher(faviconPattern);

    fileWatcher.onDidChange((uri) => {
        log(`Favicon file changed: ${uri.fsPath}`);
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (folder) {
            debounceApplyColors(folder);
        }
    });

    fileWatcher.onDidCreate((uri) => {
        log(`Favicon file created: ${uri.fsPath}`);
        const folder = vscode.workspace.getWorkspaceFolder(uri);
        if (folder) {
            debounceApplyColors(folder);
        }
    });

    fileWatcher.onDidDelete((uri) => {
        log(`Favicon file deleted: ${uri.fsPath}`);
        // Don't auto-revert on delete, just log
    });

    context.subscriptions.push(fileWatcher);
}

/**
 * Sets up configuration change listener.
 */
function setupConfigListener(context: vscode.ExtensionContext): void {
    configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
        if (event.affectsConfiguration('projectColor')) {
            log('Configuration changed, updating...');
            updateStatusBar();

            // If automatic detection is enabled, apply colors to all workspace folders
            const folders = getAllWorkspaceFolders();
            for (const folder of folders) {
                const config = getConfig(folder);
                if (config.enabled && config.enableAutomaticDetection) {
                    debounceApplyColors(folder);
                }
            }
        }
    });

    context.subscriptions.push(configChangeDisposable);
}

/**
 * Sets up workspace folder change listener.
 */
function setupWorkspaceListener(context: vscode.ExtensionContext): void {
    workspaceChangeDisposable = vscode.workspace.onDidChangeWorkspaceFolders((event) => {
        log(`Workspace folders changed: +${event.added.length} -${event.removed.length}`);
        // Clear detection caches so new folders get fresh framework/monorepo detection
        clearDetectionCaches();

        // Apply colors to newly added folders
        for (const folder of event.added) {
            const config = getConfig(folder);
            if (config.enabled && config.enableAutomaticDetection) {
                // Skip if colors already applied (e.g., from saved state)
                if (hasAppliedColors(folder)) {
                    log(`Skipping ${folder.name}: colors already applied`);
                    continue;
                }

                applyProjectColor(folder).catch((error) => {
                    logError(`Failed to apply colors to new folder ${folder.name}`, error);
                });
            }
        }

        updateStatusBar();
    });

    context.subscriptions.push(workspaceChangeDisposable);
}

/**
 * Applies colors to all workspace folders on activation.
 */
async function applyColorsOnActivation(): Promise<void> {
    const folders = getAllWorkspaceFolders();

    const applicableFolders = folders.filter(folder => {
        const config = getConfig(folder);
        if (!config.enabled) {
            log(`Skipping ${folder.name}: disabled`);
            return false;
        }
        if (!config.enableAutomaticDetection) {
            log(`Skipping ${folder.name}: automatic detection disabled`);
            return false;
        }
        // Skip if colors are already applied (prevents wasteful re-extraction
        // and protects custom hex colors from being overwritten)
        if (hasAppliedColors(folder)) {
            log(`Skipping ${folder.name}: colors already applied`);
            return false;
        }
        return true;
    });

    await Promise.all(
        applicableFolders.map(folder =>
            applyProjectColor(folder).catch(error => {
                logError(`Failed to apply colors to ${folder.name} on activation`, error);
            })
        )
    );
}

/**
 * Extension activation.
 * Called when the extension is activated.
 */
export async function activate(context: vscode.ExtensionContext): Promise<void> {
    const startTime = Date.now();
    log('Auto Project Colors extension activating...');

    try {
        // Initialize state manager
        initStateManager(context);

        // Register commands
        registerAllCommands(context);

        // Create and show status bar
        const statusBarItem = createStatusBarItem();
        context.subscriptions.push(statusBarItem);
        updateStatusBar();

        // Set up file watcher for favicon changes
        setupFileWatcher(context);

        // Set up configuration change listener
        setupConfigListener(context);

        // Set up workspace folder change listener
        setupWorkspaceListener(context);

        // Check if we have a workspace
        const folder = getWorkspaceFolder();
        if (!folder) {
            log('No workspace folder open, waiting for folder to be opened');
        } else {
            // Apply colors automatically on activation
            const config = getConfig(folder);
            if (config.enabled && config.enableAutomaticDetection) {
                // Apply asynchronously to not block activation
                setImmediate(() => {
                    applyColorsOnActivation().catch((error) => {
                        logError('Failed to apply colors on activation', error);
                    });
                });
            }
        }

        const elapsed = Date.now() - startTime;
        log(`Auto Project Colors extension activated in ${elapsed}ms`);
    } catch (error) {
        logError('Failed to activate Auto Project Colors extension', error);
        throw error;
    }
}

/**
 * Extension deactivation.
 * Called when the extension is deactivated.
 */
export function deactivate(): void {
    log('Auto Project Colors extension deactivating...');

    // Clear debounce timer
    if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = undefined;
    }

    // Dispose file watcher
    if (fileWatcher) {
        fileWatcher.dispose();
        fileWatcher = undefined;
    }

    // Dispose config listener
    if (configChangeDisposable) {
        configChangeDisposable.dispose();
        configChangeDisposable = undefined;
    }

    // Dispose workspace listener
    if (workspaceChangeDisposable) {
        workspaceChangeDisposable.dispose();
        workspaceChangeDisposable = undefined;
    }

    // Dispose status bar
    disposeStatusBar();

    // Dispose logger
    disposeLogger();

    log('Auto Project Colors extension deactivated');
}
