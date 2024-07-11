import * as vscode from 'vscode';
import * as crypto from 'crypto';

const fileHashes = new Map<string, string>();

/**
 * 函数防抖动处理
 * @param func 要执行的函数
 * @param delay 延迟的时间
 * @returns 返回一个防抖后的函数
 */
const debounce = (func: Function, delay: number) => {
    let timeoutId: NodeJS.Timeout;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => func(...args), delay);
    };
};

const debouncedUpdateMarkdownHeader = debounce(updateMarkdownHeaderIfChanged, 1000);

/**
 * 扩展激活时的入口函数
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
    // 监听文本文件保存事件
    let disposable = vscode.workspace.onDidSaveTextDocument((document: vscode.TextDocument) => {
        // 当保存的是Markdown文件且包含有效标题时，触发更新操作
        if (document.languageId === 'markdown' && hasValidHeader(document)) {
            debouncedUpdateMarkdownHeader(document);
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

        // 根据配置决定是否添加或更新更新时间字段
        if (header.includes('updated:') || autoAddUpdatedField) {
            updatedHeader = updateUpdatedField(header);
        }

        // 如果标题已更新，则应用更改
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
export {hasValidHeader};