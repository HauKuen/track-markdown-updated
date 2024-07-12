import * as assert from 'assert';
import * as vscode from 'vscode';
import { hasValidHeader, updateUpdatedField} from '../extension';

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


    suite('updateUpdatedField', () => {
        test('should add updated field if not present', () => {
            const header = 'title: Test\ndate: 2023-01-01';
            const result = updateUpdatedField(header);
            assert.match(result, /title: Test\ndate: 2023-01-01\nupdated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });

        test('should update existing updated field', () => {
            const header = 'title: Test\ndate: 2023-01-01\nupdated: 2023-01-01 12:00:00';
            const result = updateUpdatedField(header);
            assert.notStrictEqual(result, header);
            assert.match(result, /title: Test\ndate: 2023-01-01\nupdated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });

        test('should handle empty header', () => {
            const header = '';
            const result = updateUpdatedField(header);
            assert.match(result, /updated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });

        test('should maintain other fields', () => {
            const header = 'title: Test\nauthor: John Doe\ntags: [test, example]';
            const result = updateUpdatedField(header);
            assert.match(result, /title: Test\nauthor: John Doe\ntags: \[test, example\]\nupdated: \d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}/);
        });
    });

});