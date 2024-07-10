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

    // 监听文档打开事件，记录初始内容的哈希值
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown') {
            const initialHash = calculateHash(document.getText());
            fileHashes.set(document.uri.toString(), initialHash);
        }
    });
}

async function updateMarkdownHeaderIfChanged(document: vscode.TextDocument) {
    const documentUri = document.uri.toString();
    const initialHash = fileHashes.get(documentUri);
    const currentContent = document.getText();
    const currentHash = calculateHash(currentContent);
    
    // 如果哈希值没有变化，不进行更新
    if (currentHash === initialHash) {
        return;
    }

    const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = currentContent.match(headerRegex);

    if (match) {
        const header = match[1];
        const updatedHeader = updateUpdatedField(header);
        const newText = currentContent.replace(headerRegex, `---\n${updatedHeader}\n---`);

        if (newText !== currentContent) {
            const edit = new vscode.WorkspaceEdit();
            edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), newText);
            await vscode.workspace.applyEdit(edit);
            await document.save();
        }
    }

}

function updateUpdatedField(header: string): string {
    const now = new Date();
    const updatedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;
    
    if (header.includes('updated:')) {
        return header.replace(/updated:.*/, `updated: ${updatedDate}`);
    } else {
        return `${header}\nupdated: ${updatedDate}`;
    }
}

function calculateHash(content: string): string {
    return crypto.createHash('sha1').update(content).digest('hex');
}

export function deactivate() {}