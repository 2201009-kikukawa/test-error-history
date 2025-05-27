import { ExtensionContext, window, commands, languages, DiagnosticSeverity } from "vscode";
import { ErrorDemoViewProvider } from "./providers/ErrorDemoViewProvider";

export function activate(context: ExtensionContext) {
  // 出力チャンネルを作成
  const outputChannel = window.createOutputChannel("Error Demo");
  const errorProvider = new ErrorDemoViewProvider(context.extensionUri);

  const webviewViewDisposable = window.registerWebviewViewProvider(
    ErrorDemoViewProvider.viewType,
    errorProvider
  );

  // エラー表示コマンド
  const showErrorsCommand = commands.registerCommand(
    "extension.showErrorsAndOpenTerminal",
    async () => {
      errorProvider.refreshErrors();
      const editor = window.activeTextEditor;

      if (!editor) {
        const message = "アクティブなテキストエディタが見つかりません。";
        outputChannel.clear();
        outputChannel.appendLine(message);
        outputChannel.show();
        window.showInformationMessage(message);
        return;
      }

      const diagnostics = languages.getDiagnostics(editor.document.uri);

      // 出力チャンネルをクリアして表示
      outputChannel.clear();
      outputChannel.show();

      if (!diagnostics || diagnostics.length === 0) {
        const message = `ファイル ${editor.document.uri.fsPath} に診断情報は見つかりませんでした。`;
        outputChannel.appendLine(message);
        window.showInformationMessage("エラー情報を取得しました（エラーなし）");
      } else {
        outputChannel.appendLine(`=== エラー情報 ===`);
        outputChannel.appendLine(`ファイル: ${editor.document.uri.fsPath}`);
        outputChannel.appendLine(`診断数: ${diagnostics.length}件`);
        outputChannel.appendLine("=".repeat(50));

        diagnostics.forEach((diagnostic, index) => {
          let severityString: string;
          let severityIcon: string;

          switch (diagnostic.severity) {
            case DiagnosticSeverity.Error:
              severityString = "Error";
              severityIcon = "❌";
              break;
            case DiagnosticSeverity.Warning:
              severityString = "Warning";
              severityIcon = "⚠️";
              break;
            case DiagnosticSeverity.Information:
              severityString = "Information";
              severityIcon = "ℹ️";
              break;
            case DiagnosticSeverity.Hint:
              severityString = "Hint";
              severityIcon = "💡";
              break;
            default:
              severityString = "Unknown";
              severityIcon = "❓";
          }

          outputChannel.appendLine(`${index + 1}. ${severityIcon} [${severityString}]`);
          outputChannel.appendLine(`   メッセージ: ${diagnostic.message}`);
          outputChannel.appendLine(`   ソース: ${diagnostic.source || "不明"}`);
          outputChannel.appendLine(
            `   位置: 行 ${diagnostic.range.start.line + 1}, 列 ${
              diagnostic.range.start.character + 1
            }`
          );
          outputChannel.appendLine("");
        });

        window.showInformationMessage(`エラー情報を取得しました（${diagnostics.length}件）`);
      }
    }
  );

  context.subscriptions.push(webviewViewDisposable, showErrorsCommand, outputChannel);
}

export function deactivate() {}
