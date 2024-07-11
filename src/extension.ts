import * as vscode from 'vscode';
import * as crypto from 'crypto';

const fileHashes = new Map<string, string>();

export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown' && hasValidHeader(document)) {
            updateMarkdownHeaderIfChanged(document);
        }
    });
    context.subscriptions.push(disposable);

    // 监听文档打开事件，记录初始内容hash
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown' && hasValidHeader(document)) {
            const initialHash = calculateHash(document.getText());
            fileHashes.set(document.uri.toString(), initialHash);
        }
    });

    // 添加命令打开扩展设置
    let openSettingsCommand = vscode.commands.registerCommand('track-markdown-updated.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'track-markdown-updated');
    });
    context.subscriptions.push(openSettingsCommand);
}

function hasValidHeader(document: vscode.TextDocument): boolean {
    const content = document.getText();
    const headerRegex = /^---\s*\n[\s\S]*?\n---/;
    return headerRegex.test(content);
}

async function updateMarkdownHeaderIfChanged(document: vscode.TextDocument) {
    const documentUri = document.uri.toString();
    const initialHash = fileHashes.get(documentUri);
    const currentContent = document.getText();
    const currentHash = calculateHash(currentContent);

    // 如果hash没有改变，不更新
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
    }

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