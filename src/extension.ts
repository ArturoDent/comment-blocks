import { commands, window, ExtensionContext, Selection, Position, SnippetString } from 'vscode';
import { getSettings, getDefaults } from './configs';
import { makeKeybindingsCompletionProvider, makeSettingsCompletionProvider } from './completions';
import { build } from './blocks';
import { getCommonLeadingWhiteSpace } from './whitespace';
import { CommentBlockSettings } from './types';



export async function activate(context: ExtensionContext) {

  // can't use this here, something (Object.assign?) is globally changing the settings each run
  // let settings = await getSettings();
  await makeKeybindingsCompletionProvider(context);
  await makeSettingsCompletionProvider(context);

  let disposable = commands.registerCommand('comment-blocks.createBlock', async (args: CommentBlockSettings) => {

    const editor = window.activeTextEditor;
    let   selection = editor?.selection;
    const document = editor?.document;
    if (!editor || !document || !selection) return;

    // reset comments only if different languageId ( and TODO: if didn't skip language )
    if (global.previousLanguage !== document.languageId)  global.comments = undefined;
    global.previousLanguage = document.languageId;

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
      else if (startText === undefined && args.startText === undefined){
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

    // remove leading comment characters from all selected lines, the clipBoard is unaffected
    await commands.executeCommand('editor.action.removeCommentLine');
    // clipBoard: would have to know the line/block characters for each language

    if (selection.isSingleLine && selectCurrentLine === true) {      // selection is single line

      if (keepIndentation) {  // goto EOL and cursorSelectHome
        // if whole line is empty (except for some leading whiteSpace)
        if (document.lineAt(selection.active.line).firstNonWhitespaceCharacterIndex === selection.active.character)
          leadingLength = selection.active.character;
        else {
          await commands.executeCommand('cursorLineEnd');
          await commands.executeCommand('cursorHomeSelect');
          leadingLength = editor.selection.active.character;
        }
      }
      else {
        const active = selection.active;
        const lineLength = document.lineAt(active.line).text.length;
        editor.selection = new Selection(new Position(active.line, 0), new Position(active.line, lineLength));
        leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection));
        trim = true;
      }
    }

    else if (selection.isSingleLine && selectCurrentLine === false) {      // selection is single line
      if (keepIndentation) {
        leadingLength = editor.selection.active.character;
      }
      else {
        leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection));
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
        editor.selection = new Selection(new Position(anchor.line, anchorLineLength), new Position(active.line, 0));
      else if (!selection.isReversed)
        editor.selection = new Selection(new Position(anchor.line, 0), new Position(active.line, activeLineLength));

      if (keepIndentation) {
        leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection).split(/\r?\n/));
      }
      else {
        leadingLength = getCommonLeadingWhiteSpace(document.getText(editor.selection).split(/\r?\n/));
        trim = true;
      }
    }

    // else if (!selection.isSingleLine && selectCurrentLine === false) {}      // not used

    const snippet: SnippetString = await build(editor, combinedOptions, editor.selection, matchIndex, leadingLength, trim);
    await editor.insertSnippet(snippet, editor.selection);
  });

  context.subscriptions.push(disposable);

  // const onChangeConfigs = vscode.workspace.onDidChangeConfiguration(async ev => {
  //   if (ev.affectsConfiguration("commentBlocks.defaults")) settings = await getSettings();
  // });

  // context.subscriptions.push(onChangeConfigs);
}

export function deactivate() { }