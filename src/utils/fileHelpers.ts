import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import { logError, logWarning } from './logger';

export interface FileCheckResult {
    exists: boolean;
    readable: boolean;
    size: number;
    error?: string;
}

export async function checkFile(filePath: string): Promise<FileCheckResult> {
    try {
        const stats = await fs.promises.stat(filePath);

        if (!stats.isFile()) {
            return {
                exists: true,
                readable: false,
                size: 0,
                error: 'Path is not a file'
            };
        }

        // Try to read a byte to verify readability
        const fd = await fs.promises.open(filePath, 'r');
        await fd.close();

        return {
            exists: true,
            readable: true,
            size: stats.size
        };
    } catch (error) {
        if (error instanceof Error) {
            const nodeError = error as NodeJS.ErrnoException;
            if (nodeError.code === 'ENOENT') {
                return {
                    exists: false,
                    readable: false,
                    size: 0,
                    error: 'File does not exist'
                };
            }
            if (nodeError.code === 'EACCES') {
                return {
                    exists: true,
                    readable: false,
                    size: 0,
                    error: 'Permission denied'
                };
            }
            return {
                exists: false,
                readable: false,
                size: 0,
                error: error.message
            };
        }
        return {
            exists: false,
            readable: false,
            size: 0,
            error: 'Unknown error'
        };
    }
}

export async function readFileBuffer(filePath: string, maxSize: number): Promise<Buffer | null> {
    try {
        const checkResult = await checkFile(filePath);

        if (!checkResult.exists) {
            logWarning(`File does not exist: ${filePath}`);
            return null;
        }

        if (!checkResult.readable) {
            logWarning(`File is not readable: ${filePath} - ${checkResult.error}`);
            return null;
        }

        if (checkResult.size > maxSize) {
            logWarning(`File exceeds size limit (${checkResult.size} > ${maxSize}): ${filePath}`);
            return null;
        }

        const buffer = await fs.promises.readFile(filePath);
        return buffer;
    } catch (error) {
        logError(`Failed to read file: ${filePath}`, error);
        return null;
    }
}

export function resolveWorkspacePath(workspaceFolder: vscode.WorkspaceFolder, relativePath: string): string {
    // Sanitize the relative path to prevent path traversal
    const normalizedPath = path.normalize(relativePath);

    // Ensure the path doesn't escape the workspace
    if (normalizedPath.startsWith('..') || path.isAbsolute(normalizedPath)) {
        throw new Error(`Invalid path: ${relativePath}`);
    }

    return path.join(workspaceFolder.uri.fsPath, normalizedPath);
}

export function isImageFile(filePath: string): boolean {
    const ext = path.extname(filePath).toLowerCase();
    const supportedExtensions = ['.png', '.jpg', '.jpeg', '.ico', '.webp', '.gif', '.svg'];
    return supportedExtensions.includes(ext);
}

export function isSvgFile(filePath: string): boolean {
    return path.extname(filePath).toLowerCase() === '.svg';
}

export async function findFilesWithGlob(
    workspaceFolder: vscode.WorkspaceFolder,
    pattern: string,
    maxResults: number = 10
): Promise<vscode.Uri[]> {
    try {
        const relativePattern = new vscode.RelativePattern(workspaceFolder, pattern);
        const files = await vscode.workspace.findFiles(
            relativePattern,
            '**/node_modules/**',
            maxResults
        );
        return files;
    } catch (error) {
        logError(`Error searching for files with pattern: ${pattern}`, error);
        return [];
    }
}

export function getWorkspaceFolder(): vscode.WorkspaceFolder | undefined {
    const workspaceFolders = vscode.workspace.workspaceFolders;

    if (!workspaceFolders || workspaceFolders.length === 0) {
        return undefined;
    }

    // For multi-root workspaces, use the first folder as default
    return workspaceFolders[0];
}

export function getAllWorkspaceFolders(): readonly vscode.WorkspaceFolder[] {
    return vscode.workspace.workspaceFolders ?? [];
}

export function getFileExtension(filePath: string): string {
    return path.extname(filePath).toLowerCase();
}

export function getFileName(filePath: string): string {
    return path.basename(filePath);
}

export function getRelativePath(workspaceFolder: vscode.WorkspaceFolder, absolutePath: string): string {
    return path.relative(workspaceFolder.uri.fsPath, absolutePath);
}
