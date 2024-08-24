import * as vscode from 'vscode';
import { getSettings } from './config';
import * as completions from './completions';
import { build } from './blocks';


export async function activate(context: vscode.ExtensionContext) {
  
  let settings = await getSettings();
  await completions.makeKeybindingsCompletionProvider(context);
  

	let disposable = vscode.commands.registerCommand('comment-blocks.createBlock', async (args) => {
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
        
    let matchIndex = 0;
    
    if (typeof args.subjects === 'string') args.subjects = [args.subjects];
    
    if (editor.selection.isSingleLine && settings.selectCurrentLine === true) {      // previous selection, if any, is not multiline
      const sel = editor.selection.active;
      const lineLength = editor.document.lineAt(sel.line).text.length;
      editor.selection = new vscode.Selection(new vscode.Position(sel.line, 0), new vscode.Position(sel.line, lineLength));
    }
    
    // args and settings combined with args having precedence
    const combinedOptions = Object.assign(settings, args);
    
    const snippet: vscode.SnippetString = await build(editor, combinedOptions, editor.selection, matchIndex);    
    await editor.insertSnippet(snippet, editor.selection);
    
    // matchIndex++;
  });                    // end of comment-blocks.createBlock command
  
  context.subscriptions.push(disposable);
  
  vscode.workspace.onDidChangeConfiguration(async ev => {
    if (ev.affectsConfiguration("commentBlocks.defaults")) settings = await getSettings();
  });
}

export function deactivate() { }

