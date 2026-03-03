import * as assert from 'assert';
import * as vscode from 'vscode';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('Extension should be present', () => {
        assert.ok(vscode.extensions.getExtension('tomwatts.auto-project-colors'));
    });

    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);

        assert.ok(commands.includes('projectColor.apply'), 'Apply command should be registered');
        assert.ok(commands.includes('projectColor.pickIcon'), 'Pick icon command should be registered');
        assert.ok(commands.includes('projectColor.revert'), 'Revert command should be registered');
        assert.ok(commands.includes('projectColor.disable'), 'Disable command should be registered');
        assert.ok(commands.includes('projectColor.regenerate'), 'Regenerate command should be registered');
        assert.ok(commands.includes('projectColor.showStatus'), 'Show status command should be registered');
    });
});
