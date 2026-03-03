import * as vscode from 'vscode';

let outputChannel: vscode.OutputChannel | undefined;

export function getOutputChannel(): vscode.OutputChannel {
    if (!outputChannel) {
        try {
            outputChannel = vscode.window.createOutputChannel('Auto Project Colors');
        } catch {
            // Fallback if VS Code output channel creation fails
            outputChannel = {
                appendLine: (msg: string) => console.log(`[Auto Project Colors] ${msg}`),
                show: () => {},
                dispose: () => {},
            } as unknown as vscode.OutputChannel;
        }
    }
    return outputChannel;
}

export function log(message: string): void {
    const channel = getOutputChannel();
    const timestamp = new Date().toISOString();
    channel.appendLine(`[${timestamp}] ${message}`);
}

export function logError(message: string, error?: unknown): void {
    const channel = getOutputChannel();
    const timestamp = new Date().toISOString();
    channel.appendLine(`[${timestamp}] ERROR: ${message}`);
    if (error instanceof Error) {
        channel.appendLine(`  Stack: ${error.stack ?? error.message}`);
    } else if (error !== undefined) {
        channel.appendLine(`  Details: ${String(error)}`);
    }
}

export function logWarning(message: string): void {
    const channel = getOutputChannel();
    const timestamp = new Date().toISOString();
    channel.appendLine(`[${timestamp}] WARNING: ${message}`);
}

export function showOutputChannel(): void {
    getOutputChannel().show();
}

export function disposeLogger(): void {
    if (outputChannel) {
        outputChannel.dispose();
        outputChannel = undefined;
    }
}
