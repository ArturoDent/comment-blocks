import * as vscode from 'vscode';
import { getSettings } from './configs';
import * as completions from './completions';
import { build } from './blocks';


export async function activate(context: vscode.ExtensionContext) {
  
  // let settings = await getSettings();
  await completions.makeKeybindingsCompletionProvider(context);
  await completions.makeSettingsCompletionProvider(context);
  
	let disposable = vscode.commands.registerCommand('comment-blocks.createBlock', async (args) => {
  
    let settings = await getSettings();
    
    const editor = vscode.window.activeTextEditor;
    if (!editor) return;
        
    let matchIndex = 0;
    
    if (typeof args.subjects === 'string') args.subjects = [args.subjects];
    
    if (editor.selection.isSingleLine && settings.selectCurrentLine === true) {      // previous selection, if any, is not multiline
      const active = editor.selection.active;
      const lineLength = editor.document.lineAt(active.line).text.length;
      editor.selection = new vscode.Selection(new vscode.Position(active.line, 0), new vscode.Position(active.line, lineLength));
    }
    else if (!editor.selection.isSingleLine && settings.selectCurrentLine === true) {      // previous selection, if any, is not multiline
      const active = editor.selection.active;
      const anchor = editor.selection.anchor;
      const activeLineLength = editor.document.lineAt(active.line).text.length;
      const anchorLineLength = editor.document.lineAt(anchor.line).text.length;
      
      if (editor.selection.isReversed)
        editor.selection = new vscode.Selection(new vscode.Position(anchor.line, anchorLineLength), new vscode.Position(active.line, 0));
      else if (!editor.selection.isReversed)
        editor.selection = new vscode.Selection(new vscode.Position(anchor.line, 0), new vscode.Position(active.line, activeLineLength));
    }
    
    // args and settings combined with args having precedence
    const combinedOptions = await Object.assign(settings, args);
    
    const snippet: vscode.SnippetString = await build(editor, combinedOptions, editor.selection, matchIndex);    
    await editor.insertSnippet(snippet, editor.selection);
    
    // matchIndex++;
  });                    // end of comment-blocks.createBlock command
  
  context.subscriptions.push(disposable);
  
  // vscode.workspace.onDidChangeConfiguration(async ev => {
  //   if (ev.affectsConfiguration("commentBlocks.defaults")) settings = await getSettings();
  // });
}

export function deactivate() { }

