// import { commands, window, ExtensionContext, Selection, Position, SnippetString, CancellationToken, languages, ProviderResult, TextDocument, MarkdownString, Range } from 'vscode';
import { getSettings, getDefaults } from './configs';
import { makeKeybindingsCompletionProvider, makeSettingsCompletionProvider } from './completions';
import { build } from './blocks';
import { getCommonLeadingWhiteSpace } from './whitespace';
import { CommentBlockSettings } from './types';
import * as langConfigs from './getLanguageConfig';

import * as vscode from 'vscode';


export async function activate(context: vscode.ExtensionContext) {

  // can't use this here, something (Object.assign?) is globally changing the settings each run
  // let settings = await getSettings();
  await makeKeybindingsCompletionProvider(context);
  await makeSettingsCompletionProvider(context);

  if (vscode.window.activeTextEditor) {
    global.comments = await langConfigs.get(vscode.window.activeTextEditor.document.languageId, 'comments');
    global.previousLanguage = vscode.window.activeTextEditor.document.languageId;
  }

  let disposable = vscode.commands.registerCommand('comment-blocks.createBlock', async (args: CommentBlockSettings) => {

    const editor = vscode.window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document) return;

    if (!global.comments || global.previousLanguage !== document.languageId) {
      global.comments = await langConfigs.get(document.languageId, 'comments');
      global.previousLanguage = document.languageId;
    }

    let snippetEdits: Array<vscode.TextEdit> = [];
    let workspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();

    for await (let selection of editor.selections) {

      let settings = await getSettings(document);

      let { startText, endText } = settings;  // so from the 'defaults' setting

      // only works for startText = a string and not an array
      if (endText === undefined && args.endText === undefined) {
        if (typeof args.startText === "string") {
          if (args.startText.startsWith("${LINE_COMMENT}")) settings.endText = "${LINE_COMMENT}";
          else settings.endText = "${BLOCK_COMMENT_END}";
        }
        else if (typeof startText === "string" && args.startText === undefined) {
          if (startText.startsWith("${LINE_COMMENT}")) settings.endText = "${LINE_COMMENT}";
          else settings.endText = "${BLOCK_COMMENT_END}";
        }
        else if (startText === undefined && args.startText === undefined) {
          settings.endText = "${BLOCK_COMMENT_END}";
        }
        else settings.endText = "${BLOCK_COMMENT_END}";
      }

      const defaults = getDefaults();

      // set rest of defaults, if any options are undefined
      for (let [option, value] of Object.entries(defaults)) {
        if ((settings[option as keyof typeof settings]) === undefined) (settings as any)[option] = value;
      }

      // args and settings combined with args having precedence
      const combinedOptions = await Object.assign(settings, args);
      const selectCurrentLine = combinedOptions.selectCurrentLine;

      let matchIndex = 0;   // may be used in the future to support looping through multiple selections

      let keepIndentation = settings.keepIndentation;
      let trim = false;
      let leadingWhitespace = 0;

      let leadingLength = 0;  // set leading whiteSpace length, to subtract from lineLength later

      // remove comment characters
      // TODO: file an issue, for css (which has no lineComment) the below will ADD a block comment if there is none!!
      if (global.comments?.lineComment && !document.lineAt(selection.active.line).isEmptyOrWhitespace) {
        if (selectCurrentLine)
          await vscode.commands.executeCommand('editor.action.removeCommentLine');
        else {  // don't remove comment unless entire comment is selected (when selectCurrentLine = false)
          const lineComment = global.comments.lineComment.replace(/([\*/{}()])/g, '\\$1');
          const re = new RegExp(`(${lineComment})(\\s?)`);
          const match = document.getText(selection).match(re);
          
          if (match && match.index !== undefined) {
            const selectionStartIndex = selection.start.character;
            const lineCommentStartRange = new vscode.Range(
              selection.start.line, selectionStartIndex + match.index,
              selection.start.line, selectionStartIndex + match.index + match[1].length + match[2].length);
            
            const workspaceEdit = new vscode.WorkspaceEdit();
            workspaceEdit.set(document.uri, [new vscode.TextEdit(lineCommentStartRange, '')]);
            await vscode.workspace.applyEdit(workspaceEdit);
            
            // can't use below - applies to all lines with a cursor
            // await vscode.commands.executeCommand('editor.action.removeCommentLine');
          }
        }
      }
        
      else if (global.comments?.blockComment) {   // like css, html, etc.
        // have to escape characters in the blockStart/End for the regexp
        const blockStart = global.comments.blockComment[0].replace(/([\*/{}()])/g, '\\$1');
        const blockEnd = global.comments.blockComment[1].replace(/([\*/{}]())/g, '\\$1');

        const re = new RegExp(`(${blockStart})(\\s?)(.*)(\\2)(${blockEnd})`);
        let match;
        
        if (selectCurrentLine) match = document.lineAt(selection.active.line).text.match(re);
        else match = document.getText(selection).match(re);
        
        if (match && match.index !== undefined) {
          
          let selectionStartIndex = 0;
          if (selectCurrentLine === false) selectionStartIndex = selection.start.character;
          
          const blockStartRange = new vscode.Range(
            selection.start.line, selectionStartIndex + match.index,
            selection.start.line, selectionStartIndex + match.index + match[1].length + match[2].length);
          
          const blockEndCharacterStart = selectionStartIndex + match.index + match[1].length + match[2].length + match[3].length;
          const blockEndCharacterEnd = blockEndCharacterStart + match[4].length + match[5].length;
          
          const blockEndRange = new vscode.Range(
            selection.start.line, blockEndCharacterStart,
            selection.start.line, blockEndCharacterEnd);
          
          const workspaceEdit = new vscode.WorkspaceEdit();
          workspaceEdit.set(document.uri, [new vscode.TextEdit(blockEndRange, ''), new vscode.TextEdit(blockStartRange, '')]);
          await vscode.workspace.applyEdit(workspaceEdit);
          // may need to be in this order, delete end first
        }
      }

      // reset each selection
      if (selection.isSingleLine && selectCurrentLine === true) {      // selection is single line
        
        // set selection to 0 - lineEnd
        let lineEnd = document.lineAt(selection.active.line).range.end;
        let lineStart = new vscode.Position(selection.active.line, 0);
        selection = new vscode.Selection(lineStart, lineEnd);
        leadingLength = document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;

        trim = true;
      }

      else if (selection.isSingleLine && selectCurrentLine === false) {      // selection is single line
        if (keepIndentation) {
          leadingWhitespace = document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
          leadingLength = selection.start.character;        
          trim = true;
        }
        else {
          leadingWhitespace = document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
          leadingLength = selection.start.character;        
        }
      }

      // select all regardless of selectCurrentLine value
      else if (!selection.isSingleLine) {      // selection is multiline
        const active = selection.active;
        const anchor = selection.anchor;
        const activeLineLength = document.lineAt(active.line).text.length;
        const anchorLineLength = document.lineAt(anchor.line).text.length;

        if (selection.isReversed)
          selection = new vscode.Selection(new vscode.Position(anchor.line, anchorLineLength), new vscode.Position(active.line, 0));
        else if (!selection.isReversed)
          selection = new vscode.Selection(new vscode.Position(anchor.line, 0), new vscode.Position(active.line, activeLineLength));

        if (keepIndentation) {
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection).split(/\r?\n/));
        }
        else {
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection).split(/\r?\n/));
          trim = true;
        }
      }

      else if (!selection.isSingleLine && selectCurrentLine === false) {}      // not used

      const snippet: string = await build(editor, combinedOptions, selection, matchIndex, leadingLength, trim, leadingWhitespace, selectCurrentLine ?? true);
      snippetEdits.push(new vscode.TextEdit(selection, snippet));
    }

    workspaceEdit.set(document.uri, snippetEdits);
    await vscode.workspace.applyEdit(workspaceEdit);
  });

  context.subscriptions.push(disposable);

  // const onChangeConfigs = vscode.workspace.onDidChangeConfiguration(async ev => {
  //   if (ev.affectsConfiguration("commentBlocks.defaults")) settings = await getSettings();
  // });

  // context.subscriptions.push(onChangeConfigs);
}

export function deactivate() { }