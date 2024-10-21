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
    // let   selection = editor?.selection;
    const document = editor?.document;
    // if (!editor || !document || !selection) return;
    if (!editor || !document) return;

    if (!global.comments || global.previousLanguage !== document.languageId) {
      global.comments = await langConfigs.get(document.languageId, 'comments');
      global.previousLanguage = document.languageId;
    }

    let snippetEdits: Array<vscode.SnippetTextEdit> = [];
    let workspaceEdit: vscode.WorkspaceEdit = new vscode.WorkspaceEdit();

    // let index = 0;
    for await (let selection of editor.selections) {

    // let   selection = editor?.selection;const [key, value]

      // reset comments only if different languageId ( and TODO: if didn't skip language )
      // if (global.previousLanguage !== document.languageId) global.comments = undefined;
      // global.previousLanguage = document.languageId;

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

      let leadingLength = 0;  // set leading whiteSpace length, to subtract from lineLength later

      // TODO: file an issue, for css (which has no lineComment) the below will ADD a block comment if there is none!!
      // remove leading comment characters from all selected lines, the clipBoard is unaffected
      // temporary workaround:
      // if (document.languageId !== 'css' && document.languageId !== 'html' && !document.lineAt(selection.active.line).isEmptyOrWhitespace)
      if (global.comments?.lineComment && !document.lineAt(selection.active.line).isEmptyOrWhitespace)
        await vscode.commands.executeCommand('editor.action.removeCommentLine');
        
      else if (global.comments?.blockComment) {
        // have to escape characters in the blockStart/End
        const blockStart = global.comments.blockComment[0].replace(/([\*/{}()])/g, '\\$1');
        const blockEnd = global.comments.blockComment[1].replace(/([\*/{}]())/g, '\\$1');

        const re = new RegExp(`^\\s*${blockStart}.*${blockEnd}\\s*$`, 'm');
        if (document.lineAt(selection.active.line).text.match(re)) {
          await vscode.commands.executeCommand('editor.action.blockComment');
        }
      }

      // check if is commented  /^\s*/*.**/\s*$/m:

      if (selection.isSingleLine && selectCurrentLine === true) {      // selection is single line

        if (keepIndentation) {  // goto EOL and cursorSelectHome

          // if whole line is empty (except for some leading whiteSpace)
          //               firstNonWhitespaceCharacterIndex                 
          // The offset of the first character which is not a whitespace character as defined by /\s /. 
          // Note that if a line is all whitespace the length of the line is returned.
          if (document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex === selection.active.character)
            leadingLength = selection.active.character;
          else {
            // TODO: do this with cursor movements/selections
            // make this selection
            let lineEnd = document.lineAt(selection.active.line).range.end;
            let lineStart = new vscode.Position(selection.active.line, document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex);
            // await vscode.commands.executeCommand('cursorLineEnd');
            // await vscode.commands.executeCommand('cursorHomeSelect');
            // selection = new vscode.Selection(editor.selections[index].anchor, editor.selections[index].active);
            selection = new vscode.Selection(lineStart, lineEnd);
            // leadingLength = selection.active.character;
            leadingLength = document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex;
          }
        }
        else {
          const active = selection.active;
          const lineLength = document.lineAt(active.line).text.length;
          // editor.selection = new vscode.Selection(new vscode.Position(active.line, 0), new vscode.Position(active.line, lineLength));
          selection = new vscode.Selection(new vscode.Position(active.line, 0), new vscode.Position(active.line, lineLength));
          // leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection));
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection));
          trim = true;
        }
      }

      else if (selection.isSingleLine && selectCurrentLine === false) {      // selection is single line
        if (keepIndentation) {
          // leadingLength = editor.selection.active.character;
          leadingLength = selection.active.character;
        }
        else {
          // leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection));
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection));
          trim = true;
        }
      }

      // select all regardless of selectCurrentLine value
      else if (!selection.isSingleLine) {      // selection is multiline
        const active = selection.active;
        const anchor = selection.anchor;
        const activeLineLength = document.lineAt(active.line).text.length;
        const anchorLineLength = document.lineAt(anchor.line).text.length;

        if (selection.isReversed)
          // editor.selection = new vscode.Selection(new vscode.Position(anchor.line, anchorLineLength), new vscode.Position(active.line, 0));
          selection = new vscode.Selection(new vscode.Position(anchor.line, anchorLineLength), new vscode.Position(active.line, 0));
        else if (!selection.isReversed)
          // editor.selection = new vscode.Selection(new vscode.Position(anchor.line, 0), new vscode.Position(active.line, activeLineLength));
          selection = new vscode.Selection(new vscode.Position(anchor.line, 0), new vscode.Position(active.line, activeLineLength));

        if (keepIndentation) {
          // leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection).split(/\r?\n/));
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection).split(/\r?\n/));
        }
        else {
          // leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection).split(/\r?\n/));
          leadingLength = getCommonLeadingWhiteSpace(document.getText(selection).split(/\r?\n/));
          trim = true;
        }
      }

      else if (!selection.isSingleLine && selectCurrentLine === false) {}      // not used

      // const snippet: vscode.SnippetString = await build(editor, combinedOptions, editor.selection, matchIndex, leadingLength, trim);
      const snippet: vscode.SnippetString = await build(editor, combinedOptions, selection, matchIndex, leadingLength, trim);
      // await editor.insertSnippet(snippet, editor.selection);

      // try making this a WorkspaceEdit TODO
      snippetEdits.push(new vscode.SnippetTextEdit(selection, snippet));

      // await editor.insertSnippet(snippet, selection);
      // index++;
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