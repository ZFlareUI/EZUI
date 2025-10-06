"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.deactivate = exports.activate = void 0;
const vscode = __importStar(require("vscode"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
function activate(context) {
    console.log('EZUI Language Support is now active!');
    // Register the compile command
    const compileCommand = vscode.commands.registerCommand('ezui.compile', async (uri) => {
        if (!uri) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No EZUI file selected');
                return;
            }
            uri = editor.document.uri;
        }
        if (!uri.fsPath.endsWith('.ezui')) {
            vscode.window.showErrorMessage('Selected file is not an EZUI file');
            return;
        }
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();
            // Simulate compilation (you can integrate with your actual EZUI compiler here)
            const compiledContent = await compileEZUI(content);
            // Create output file
            const outputPath = uri.fsPath.replace('.ezui', '.js');
            fs.writeFileSync(outputPath, compiledContent);
            vscode.window.showInformationMessage(`EZUI file compiled successfully: ${path.basename(outputPath)}`);
        }
        catch (error) {
            vscode.window.showErrorMessage(`Compilation failed: ${error}`);
        }
    });
    // Register the preview command
    const previewCommand = vscode.commands.registerCommand('ezui.preview', async (uri) => {
        if (!uri) {
            const editor = vscode.window.activeTextEditor;
            if (!editor) {
                vscode.window.showErrorMessage('No EZUI file selected');
                return;
            }
            uri = editor.document.uri;
        }
        if (!uri.fsPath.endsWith('.ezui')) {
            vscode.window.showErrorMessage('Selected file is not an EZUI file');
            return;
        }
        // Create and show preview panel
        const panel = vscode.window.createWebviewPanel('ezuiPreview', `Preview: ${path.basename(uri.fsPath)}`, vscode.ViewColumn.Beside, {
            enableScripts: true,
            localResourceRoots: [vscode.Uri.file(path.dirname(uri.fsPath))]
        });
        try {
            const document = await vscode.workspace.openTextDocument(uri);
            const content = document.getText();
            // Generate preview HTML
            const previewHtml = await generatePreview(content, uri.fsPath);
            panel.webview.html = previewHtml;
        }
        catch (error) {
            panel.webview.html = `<html><body><h1>Preview Error</h1><p>${error}</p></body></html>`;
        }
    });
    // Register completion provider
    const completionProvider = vscode.languages.registerCompletionItemProvider('ezui', {
        provideCompletionItems(document, position) {
            const completions = [];
            // Component keywords
            const componentKeywords = ['component', 'state', 'style', 'template', 'script'];
            componentKeywords.forEach(keyword => {
                const completion = new vscode.CompletionItem(keyword, vscode.CompletionItemKind.Keyword);
                completion.detail = `EZUI ${keyword} block`;
                completion.insertText = new vscode.SnippetString(`${keyword} {\n\t$0\n}`);
                completions.push(completion);
            });
            // HTML elements
            const htmlElements = ['div', 'span', 'button', 'input', 'form', 'h1', 'h2', 'h3', 'p', 'a', 'img'];
            htmlElements.forEach(element => {
                const completion = new vscode.CompletionItem(element, vscode.CompletionItemKind.Property);
                completion.detail = `HTML ${element} element`;
                completion.insertText = new vscode.SnippetString(`<${element}>$0</${element}>`);
                completions.push(completion);
            });
            return completions;
        }
    }, '{', '<' // trigger characters
    );
    // Register hover provider
    const hoverProvider = vscode.languages.registerHoverProvider('ezui', {
        provideHover(document, position) {
            const range = document.getWordRangeAtPosition(position);
            const word = document.getText(range);
            const ezuiKeywords = {
                'component': 'Defines an EZUI component with the specified name',
                'state': 'Defines reactive state variables for the component',
                'style': 'Contains CSS styles scoped to the component',
                'template': 'Contains the HTML template with EZUI syntax',
                'script': 'Contains JavaScript logic for the component'
            };
            if (ezuiKeywords[word]) {
                return new vscode.Hover(new vscode.MarkdownString(ezuiKeywords[word]));
            }
        }
    });
    // Register diagnostic provider for validation
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('ezui');
    const validateDocument = (document) => {
        const diagnostics = [];
        const text = document.getText();
        const lines = text.split('\n');
        lines.forEach((line, lineIndex) => {
            // Simple validation: check for unclosed braces
            const openBraces = (line.match(/\{/g) || []).length;
            const closeBraces = (line.match(/\}/g) || []).length;
            if (openBraces > closeBraces) {
                const diagnostic = new vscode.Diagnostic(new vscode.Range(lineIndex, 0, lineIndex, line.length), 'Possible unclosed brace', vscode.DiagnosticSeverity.Warning);
                diagnostics.push(diagnostic);
            }
        });
        diagnosticCollection.set(document.uri, diagnostics);
    };
    // Validate on document changes
    const onDidChangeTextDocument = vscode.workspace.onDidChangeTextDocument((event) => {
        if (event.document.languageId === 'ezui') {
            validateDocument(event.document);
        }
    });
    // Validate on document open
    const onDidOpenTextDocument = vscode.workspace.onDidOpenTextDocument((document) => {
        if (document.languageId === 'ezui') {
            validateDocument(document);
        }
    });
    context.subscriptions.push(compileCommand, previewCommand, completionProvider, hoverProvider, diagnosticCollection, onDidChangeTextDocument, onDidOpenTextDocument);
}
exports.activate = activate;
async function compileEZUI(content) {
    // This is a simplified compiler - you can integrate with your actual EZUI compiler
    const lines = content.split('\n');
    let compiled = '// Compiled from EZUI\n';
    let inComponent = false;
    let componentName = '';
    let stateContent = '';
    let templateContent = '';
    let styleContent = '';
    let scriptContent = '';
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('<component')) {
            inComponent = true;
            const match = trimmed.match(/<component\s+([^>]+)>/);
            componentName = match ? match[1] : 'UnnamedComponent';
        }
        else if (trimmed === '</component>' || trimmed.includes('</component>')) {
            inComponent = false;
        }
        else if (inComponent) {
            if (trimmed.startsWith('state {')) {
                stateContent = 'const state = {\n';
            }
            else if (trimmed.startsWith('template {')) {
                templateContent = 'const template = `\n';
            }
            else if (trimmed.startsWith('style {')) {
                styleContent = 'const styles = `\n';
            }
            else if (trimmed.startsWith('script {')) {
                scriptContent = '\n// Component logic\n';
            }
            else if (trimmed === '}') {
                // Close current block
                if (stateContent && !stateContent.includes('};')) {
                    stateContent += '};\n';
                }
                if (templateContent && !templateContent.includes('`;')) {
                    templateContent += '`;\n';
                }
                if (styleContent && !styleContent.includes('`;')) {
                    styleContent += '`;\n';
                }
            }
            else {
                // Add content to appropriate block
                if (stateContent && !stateContent.includes('};')) {
                    stateContent += `  ${line}\n`;
                }
                else if (templateContent && !templateContent.includes('`;')) {
                    templateContent += `  ${line}\n`;
                }
                else if (styleContent && !styleContent.includes('`;')) {
                    styleContent += `  ${line}\n`;
                }
                else if (scriptContent) {
                    scriptContent += `${line}\n`;
                }
            }
        }
    }
    compiled += `// Component: ${componentName}\n`;
    compiled += stateContent + '\n';
    compiled += templateContent + '\n';
    compiled += styleContent + '\n';
    compiled += scriptContent + '\n';
    compiled += `\n// Export component\nexport { ${componentName} };\n`;
    return compiled;
}
async function generatePreview(content, filePath) {
    const componentName = path.basename(filePath, '.ezui');
    return `
    <!DOCTYPE html>
    <html>
    <head>
        <title>EZUI Preview - ${componentName}</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                margin: 0;
                padding: 20px;
                background: #f5f5f5;
            }
            .preview-container {
                background: white;
                padding: 20px;
                border-radius: 8px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.1);
                max-width: 800px;
                margin: 0 auto;
            }
            .preview-header {
                border-bottom: 1px solid #eee;
                padding-bottom: 10px;
                margin-bottom: 20px;
            }
            .code-block {
                background: #f8f8f8;
                border: 1px solid #e1e1e1;
                border-radius: 4px;
                padding: 15px;
                margin: 10px 0;
                overflow: auto;
            }
            pre {
                margin: 0;
                font-family: 'SF Mono', Monaco, Consolas, monospace;
                font-size: 13px;
            }
        </style>
    </head>
    <body>
        <div class="preview-container">
            <div class="preview-header">
                <h1>EZUI Component Preview</h1>
                <p><strong>Component:</strong> ${componentName}</p>
            </div>
            
            <h3>Source Code:</h3>
            <div class="code-block">
                <pre>${escapeHtml(content)}</pre>
            </div>
            
            <h3>Component Structure:</h3>
            <div class="code-block">
                <pre>This is a preview of your EZUI component.
The actual component would be rendered here with full functionality.</pre>
            </div>
        </div>
    </body>
    </html>
    `;
}
function escapeHtml(unsafe) {
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}
function deactivate() { }
exports.deactivate = deactivate;
//# sourceMappingURL=extension.js.map