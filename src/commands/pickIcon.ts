import * as vscode from 'vscode';
import { getWorkspaceFolder, isImageFile } from '../utils/fileHelpers';
import { getConfig } from '../utils/config';
import { validateIconPath } from '../icons/iconFinder';
import { extractDominantColor, getDefaultColor } from '../colors/colorExtractor';
import { generatePalette } from '../colors/colorGenerator';
import { applyColors } from '../ui/uiApplier';
import { updateStatusBar } from '../ui/statusBar';
import { log, logError } from '../utils/logger';

/**
 * Opens a file picker to let user select an icon file manually.
 */
export async function pickIconFile(): Promise<void> {
    const folder = getWorkspaceFolder();

    if (!folder) {
        vscode.window.showWarningMessage('No workspace folder open. Open a folder to use Auto Project Colors.');
        return;
    }

    const config = getConfig(folder);

    // Open file picker
    const fileUris = await vscode.window.showOpenDialog({
        canSelectFiles: true,
        canSelectFolders: false,
        canSelectMany: false,
        defaultUri: folder.uri,
        filters: {
            'Images': ['png', 'jpg', 'jpeg', 'ico', 'webp', 'gif', 'svg']
        },
        title: 'Select Project Icon'
    });

    if (!fileUris || fileUris.length === 0) {
        // User cancelled
        return;
    }

    const selectedFile = fileUris[0];
    const filePath = selectedFile.fsPath;

    log(`User selected icon file: ${filePath}`);

    // Validate the selected file
    if (!isImageFile(filePath)) {
        vscode.window.showErrorMessage('Selected file is not a supported image format.');
        return;
    }

    const validationResult = await validateIconPath(filePath, folder);

    if (!validationResult.found) {
        vscode.window.showErrorMessage(`Invalid icon file: ${validationResult.error}`);
        return;
    }

    try {
        // Extract color
        const extractionResult = await extractDominantColor(filePath, config.maxImageSize);

        if (!extractionResult.success) {
            vscode.window.showWarningMessage(
                `Could not extract color from selected image. Using default color.`
            );
            const defaultResult = getDefaultColor();
            const palette = generatePalette(
                defaultResult.color!,
                config.paletteStrategy,
                config.contrastTarget
            );
            await applyColors(folder, palette, filePath);
            updateStatusBar();
            return;
        }

        // Generate palette and apply
        const palette = generatePalette(
            extractionResult.color!,
            config.paletteStrategy,
            config.contrastTarget
        );

        const applyResult = await applyColors(folder, palette, filePath);

        if (!applyResult.success) {
            vscode.window.showErrorMessage(`Failed to apply colors: ${applyResult.error}`);
            return;
        }

        // Update status bar
        updateStatusBar();

        // Show success
        if (config.notifyOnApply) {
            vscode.window.showInformationMessage(
                `Applied project color ${palette.primary} from selected icon`
            );
        }

        log(`Successfully applied color from manually selected icon: ${filePath}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Failed to apply color from selected icon`, error);
        vscode.window.showErrorMessage(`Failed to apply project color: ${errorMessage}`);
    }
}

/**
 * Registers the pick icon command.
 */
export function registerPickIconCommand(context: vscode.ExtensionContext): vscode.Disposable {
    return vscode.commands.registerCommand('projectColor.pickIcon', async () => {
        await pickIconFile();
    });
}
