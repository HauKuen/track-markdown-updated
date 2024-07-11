import * as assert from 'assert';
import * as vscode from 'vscode';
import { hasValidHeader} from '../extension';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    test('hasValidHeader should return true for valid header', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: '---\ntitle: Test\n---\nContent',
            language: 'markdown'
        });
        assert.strictEqual(hasValidHeader(document), true);
    });

    test('hasValidHeader should return false for invalid header', async () => {
        const document = await vscode.workspace.openTextDocument({
            content: 'No header here\nJust content',
            language: 'markdown'
        });
        assert.strictEqual(hasValidHeader(document), false);
    });

});