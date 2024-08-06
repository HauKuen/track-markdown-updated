import * as vscode from "vscode";
import * as crypto from "crypto";

// 存储文件内容的哈希值，用于检测变化
const fileHashes = new Map<string, string>();

/**
 * 扩展激活时的入口函数
 * @param context 扩展上下文
 */
export function activate(context: vscode.ExtensionContext) {
  const disposables = [
    vscode.workspace.onWillSaveTextDocument(handleWillSaveTextDocument),
    vscode.workspace.onDidOpenTextDocument(handleDidOpenTextDocument),
    vscode.commands.registerCommand(
      "track-markdown-updated.openSettings",
      openSettings
    ),
  ];

  context.subscriptions.push(...disposables);
}

/**
 * 处理文档即将保存的事件
 * @param event 文档将要保存的事件对象
 */
async function handleWillSaveTextDocument(
  event: vscode.TextDocumentWillSaveEvent
) {
  const { document } = event;
  if (document.languageId === "markdown" && hasValidHeader(document)) {
    event.waitUntil(updateMarkdownHeaderIfChanged(document));
  }
}

/**
 * 处理文档打开的事件
 * @param document 打开的文档对象
 */
function handleDidOpenTextDocument(document: vscode.TextDocument) {
  if (document.languageId === "markdown" && hasValidHeader(document)) {
    const content = document.getText();
    const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
    const match = content.match(headerRegex);
    if (match) {
      const contentWithoutHeader = content.replace(headerRegex, "");
      const initialHash = calculateHash(contentWithoutHeader);
      fileHashes.set(document.uri.toString(), initialHash);
    }
  }
}

/**
 * 打开扩展设置
 */
function openSettings() {
  vscode.commands.executeCommand(
    "workbench.action.openSettings",
    "track-markdown-updated"
  );
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
 * 如果文档的内容已更改，则更新标题中的更新时间字段
 * @param document 要检查的Markdown文档
 * @returns 返回TextEdit数组，表示要应用的编辑
 */
async function updateMarkdownHeaderIfChanged(
  document: vscode.TextDocument
): Promise<vscode.TextEdit[]> {
  const documentUri = document.uri.toString();
  const currentContent = document.getText();
  const headerRegex = /^---\s*\n([\s\S]*?)\n---/;
  const match = currentContent.match(headerRegex);

  if (!match) {
    return [];
  }

  const [fullMatch, header] = match;
  const contentWithoutHeader = currentContent.replace(headerRegex, "");
  const currentHash = calculateHash(contentWithoutHeader);
  const initialHash = fileHashes.get(documentUri);

  if (currentHash === initialHash) {
    return [];
  }

  const config = vscode.workspace.getConfiguration("track-markdown-updated");
  const autoAddUpdatedField = config.get("autoAddUpdatedField", true);

  if (header.includes("updated:") || autoAddUpdatedField) {
    const updatedHeader = updateUpdatedField(header);
    if (updatedHeader !== header) {
      const newText = currentContent.replace(
        fullMatch,
        `---\n${updatedHeader}\n---`
      );
      fileHashes.set(documentUri, currentHash);
      return [
        vscode.TextEdit.replace(
          new vscode.Range(0, 0, document.lineCount, 0),
          newText
        ),
      ];
    }
  }

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
  const updatedDate = now.toISOString().replace(/T/, " ").replace(/\..+/, "");

  return header.includes("updated:")
    ? header.replace(/updated:.*/, `updated: ${updatedDate}`)
    : `${header}\nupdated: ${updatedDate}`.trim();
}

/**
 * 计算字符串的SHA1哈希值
 * @param content 要计算哈希值的字符串
 * @returns 返回哈希值
 */
function calculateHash(content: string): string {
  return crypto.createHash("sha1").update(content).digest("hex");
}

export function deactivate() {}

export { hasValidHeader, updateUpdatedField };
