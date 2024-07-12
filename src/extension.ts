import * as vscode from 'vscode';
import * as crypto from 'crypto';

const fileHashes = new Map<string, string>();


/**
 * 扩展激活时的入口函数
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.workspace.onWillSaveTextDocument((event: vscode.TextDocumentWillSaveEvent) => {
        if (event.document.languageId === 'markdown' && hasValidHeader(event.document)) {
            event.waitUntil(updateMarkdownHeaderIfChanged(event.document));
        }
    });
    context.subscriptions.push(disposable);

    // 监听文档打开事件，记录初始内容hash
    vscode.workspace.onDidOpenTextDocument((document: vscode.TextDocument) => {
        if (document.languageId === 'markdown' && hasValidHeader(document)) {
            const content = document.getText();
            const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
            const match = content.match(headerRegex);
            if (match) {
                const contentWithoutHeader = content.replace(headerRegex, '');
                const initialHash = calculateHash(contentWithoutHeader);
                fileHashes.set(document.uri.toString(), initialHash);
            }
        }
    });

    // 注册打开扩展设置命令
    let openSettingsCommand = vscode.commands.registerCommand('track-markdown-updated.openSettings', () => {
        vscode.commands.executeCommand('workbench.action.openSettings', 'track-markdown-updated');
    });
    context.subscriptions.push(openSettingsCommand);
}

/**
 * 检查文档是否具有有效的标题
 * @param document 要检查的文档
 * @returns 返回是否具有有效标题
 */
function hasValidHeader(document: vscode.TextDocument): boolean {
    const content = document.getText();
    const headerRegex = /^---\s*\n[\s\S]*?\n---/;
    return headerRegex.test(content);
}

/**
 * 如果文档的标题已更改，则更新标题中的更新时间字段
 * @param document 要检查的Markdown文档
 */
async function updateMarkdownHeaderIfChanged(document: vscode.TextDocument): Promise<vscode.TextEdit[]> {
    const documentUri = document.uri.toString();
    const currentContent = document.getText();
    const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = currentContent.match(headerRegex);

    if (!match) {
        return [];
    }

    const header = match[1];
    const contentWithoutHeader = currentContent.replace(headerRegex, '');

    // 计算不包含header的内容的哈希值
    const currentHash = calculateHash(contentWithoutHeader);
    const initialHash = fileHashes.get(documentUri);

    if (currentHash === initialHash) {
        return [];
    }

    const config = vscode.workspace.getConfiguration('track-markdown-updated');
    const autoAddUpdatedField = config.get('autoAddUpdatedField', true);

    let updatedHeader = header;

    if (header.includes('updated:') || autoAddUpdatedField) {
        updatedHeader = updateUpdatedField(header);
    }

    if (updatedHeader !== header) {
        const newText = currentContent.replace(headerRegex, `---\n${updatedHeader}\n---`);
        fileHashes.set(documentUri, currentHash);
        return [vscode.TextEdit.replace(new vscode.Range(0, 0, document.lineCount, 0), newText)];
    }

    // 如果没有需要更新的内容，返回空数组
    fileHashes.set(documentUri, currentHash);
    return []; 
}

/**
 * 更新或添加文档标题中的更新时间字段
 * @param header 原始标题
 * @returns 返回更新后的标题
 */
function updateUpdatedField(header: string): string {
    const now = new Date();
    const updatedDate = `${now.getFullYear()}-${(now.getMonth() + 1).toString().padStart(2, '0')}-${now.getDate().toString().padStart(2, '0')} ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`;

    if (header.includes('updated:')) {
        return header.replace(/updated:.*/, `updated: ${updatedDate}`);
    } else {
        return `${header}\nupdated: ${updatedDate}`.trim();
    }
}

/**
 * 计算字符串的SHA1哈希值
 * @param content 要计算哈希值的字符串
 * @returns 返回哈希值
 */
function calculateHash(content: string): string {
    return crypto.createHash('sha1').update(content).digest('hex');
}

export function deactivate() {}
export {hasValidHeader, updateUpdatedField};