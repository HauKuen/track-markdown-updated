import * as vscode from 'vscode';
import * as crypto from 'crypto';

const fileHashes = new Map<string, string>();

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown') {
            updateMarkdownHeaderIfChanged(document);
        }
    });
    context.subscriptions.push(disposable);

    // Listen for document open events, record the initial content hash
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown') {
            const initialHash = calculateHash(document.getText());
            fileHashes.set(document.uri.toString(), initialHash);
        }
    });

    // Add a command to open extension settings
    let openSettingsCommand = vscode.commands.registerCommand('track-markdown-updated.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'track-markdown-updated');
    });
    context.subscriptions.push(openSettingsCommand);
}

async function updateMarkdownHeaderIfChanged(document: vscode.TextDocument) {
    const documentUri = document.uri.toString();
    const initialHash = fileHashes.get(documentUri);
    const currentContent = document.getText();
    const currentHash = calculateHash(currentContent);

    // If the hash hasn't changed, don't update
    if (currentHash === initialHash) {
        return;
    }

    const config = vscode.workspace.getConfiguration('track-markdown-updated');
    const autoAddUpdatedField = config.get('autoAddUpdatedField', true);

    const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = currentContent.match(headerRegex);

    if (match) {
        const header = match[1];
        let updatedHeader = header;

        if (header.includes('updated:') || autoAddUpdatedField) {
            updatedHeader = updateUpdatedField(header);
        }

        if (updatedHeader !== header) {
            const newText = currentContent.replace(headerRegex, `---\n${updatedHeader}\n---`);
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            await vscode.workspace.applyEdit(edit);
            await document.save();
        }
    } else if (autoAddUpdatedField) {
        // If there's no YAML front matter and autoAddUpdatedField is true, add it
        const updatedHeader = updateUpdatedField('');
        const newText = `---\n${updatedHeader}\n---\n\n${currentContent}`;
        const edit = new vscode.WorkspaceEdit();
        edit.insert(document.uri, new vscode.Position(0, 0), newText);
        await vscode.workspace.applyEdit(edit);
        await document.save();
    }

    // Update the file hash after changes
    fileHashes.set(documentUri, currentHash);
}

function updateUpdatedField(header: string): string {
    const now = new Date();
    const updatedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    if (header.includes('updated:')) {
        return header.replace(/updated:.*/, `updated: ${updatedDate}`);
    } else {
        return `${header}\nupdated: ${updatedDate}`.trim();
    }
}

function calculateHash(content: string): string {
    return crypto.createHash('sha1').update(content).digest('hex');
}

export function deactivate() {}