import * as vscode from "vscode";
import { getNonce } from "../utilities/getNonce";

export class ErrorDemoViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewType = "errorDemoView";

  private _view?: vscode.WebviewView;

  constructor(private readonly _extensionUri: vscode.Uri) {}

  public resolveWebviewView(
    webviewView: vscode.WebviewView,
    context: vscode.WebviewViewResolveContext,
    _token: vscode.CancellationToken
  ) {
    this._view = webviewView;

    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [this._extensionUri],
    };

    webviewView.webview.html = this._getWebviewContent(webviewView.webview);

    webviewView.webview.onDidReceiveMessage((data) => {
      switch (data.type) {
        case "info":
          vscode.window.showInformationMessage(`Info: ${data.value}`);
          break;
      }
    });
  }

  public updateErrors(errors: any[]) {
    if (this._view) {
      this._view.webview.postMessage({
        type: "updateErrors",
        errors: errors,
      });
    }
  }

  public refreshErrors() {
    const editor = vscode.window.activeTextEditor;

    if (!editor) {
      this.updateErrors([
        {
          type: "info",
          message: "アクティブなエディタがありません",
          source: "Error Demo",
          line: 0,
          column: 0,
        },
      ]);
      return;
    }

    const diagnostics = vscode.languages.getDiagnostics(editor.document.uri);

    if (!diagnostics || diagnostics.length === 0) {
      this.updateErrors([
        {
          type: "info",
          message: "エラーは見つかりませんでした",
          source: "Error Demo",
          line: 0,
          column: 0,
        },
      ]);
      return;
    }

    const errors = diagnostics.map((diagnostic, index) => {
      let severityString: string;
      switch (diagnostic.severity) {
        case vscode.DiagnosticSeverity.Error:
          severityString = "Error";
          break;
        case vscode.DiagnosticSeverity.Warning:
          severityString = "Warning";
          break;
        case vscode.DiagnosticSeverity.Information:
          severityString = "Information";
          break;
        case vscode.DiagnosticSeverity.Hint:
          severityString = "Hint";
          break;
        default:
          severityString = "Unknown";
      }

      return {
        type: severityString,
        message: diagnostic.message,
        source: diagnostic.source || "不明",
        line: diagnostic.range.start.line + 1,
        column: diagnostic.range.start.character + 1,
      };
    });

    this.updateErrors(errors);
  }

  private _getWebviewContent(webview: vscode.Webview) {
    const nonce = getNonce();

    return /*html*/ `
      <!DOCTYPE html>
      <html lang="ja">
        <head>
          <meta charset="UTF-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
          <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline' ${webview.cspSource}; script-src 'nonce-${nonce}';">
          <title>Error Demo</title>
        </head>
        <body>
          <div id="content">
            <div class="no-errors">エラー情報を取得するにはコマンドを実行してください</div>
          </div>
          <script nonce="${nonce}">
            const vscode = acquireVsCodeApi();
            
            window.addEventListener('message', event => {
              const message = event.data;
              switch (message.type) {
                case 'updateErrors':
                  updateErrorDisplay(message.errors);
                  break;
              }
            });

            function updateErrorDisplay(errors) {
              const content = document.getElementById('content');
              
              if (!errors || errors.length === 0) {
                content.innerHTML = '<div class="no-errors">エラーは見つかりませんでした</div>';
                return;
              }

              let html = '';
              errors.forEach((error, index) => {
                const typeClass = error.type.toLowerCase();
                html += \`
                  <div class="error-item \${typeClass}">
                    <div class="error-type">\${error.type}</div>
                    <div class="error-message">\${error.message}</div>
                    <div class="error-details">
                      ソース: \${error.source} | 行: \${error.line}, 列: \${error.column}
                    </div>
                  </div>
                \`;
              });
              
              content.innerHTML = html;
            }
          </script>
        </body>
      </html>
    `;
  }
}
