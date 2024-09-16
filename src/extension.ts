import { commands, window, ExtensionContext, Selection, Position, SnippetString } from 'vscode';
import { getSettings, getDefaults } from './configs';
import { makeKeybindingsCompletionProvider, makeSettingsCompletionProvider } from './completions';
import { build } from './blocks';



export async function activate(context: ExtensionContext) {

  // can't use this here, something (Object.assign?) is globally changing the settings each run
  // let settings = await getSettings();
  await makeKeybindingsCompletionProvider(context);
  await makeSettingsCompletionProvider(context);

  let disposable = commands.registerCommand('comment-blocks.createBlock', async (args) => {

    const editor = window.activeTextEditor;
    const document = editor?.document;
    if (!editor || !document) return;

    // reset comments only if different languageId ( and TODO: if didn't skip language )
    if (global.previousLanguage !== document.languageId)  global.comments = undefined;
    global.previousLanguage = document.languageId;

    let settings = await getSettings(document);

    let { startText, endText } = settings;  // so from the 'defaults' setting

    // only works for startText = "qwerty" and not an array
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

    // set rest of defaults
    const defaults = getDefaults();

    for (let [option, value] of Object.entries(defaults)) {
      if (!(settings[option as keyof typeof settings])) (settings as any)[option] = value;
    }

    // args and settings combined with args having precedence
    const combinedOptions = await Object.assign(settings, args);
    const selectCurrentLine = combinedOptions.selectCurrentLine;

    let matchIndex = 0;   // may be used in the future to support looping through multiple selections

    // remove leading comment characters from all selected lines, the clipBoard is unaffected
    await commands.executeCommand('editor.action.removeCommentLine');
    // clipBoard: would have to know the line/block characters for each language
    // await langConfigs.get(document.languageId, 'comments')

    // do nothing regardless of settings.selectCurrentLine if there is a non-empty selection on a single line
    if (!editor.selection.isEmpty && editor.selection.isSingleLine) {}

    else if (editor.selection.isSingleLine && selectCurrentLine === true) {      // previous selection, if any, is not multiline
      const active = editor.selection.active;
      const lineLength = editor.document.lineAt(active.line).text.length;
      editor.selection = new Selection(new Position(active.line, 0), new Position(active.line, lineLength));
    }

    else if (!editor.selection.isSingleLine && selectCurrentLine === true) {      // previous selection, if any, is not multiline
      const active = editor.selection.active;
      const anchor = editor.selection.anchor;
      const activeLineLength = editor.document.lineAt(active.line).text.length;
      const anchorLineLength = editor.document.lineAt(anchor.line).text.length;

      if (editor.selection.isReversed)
        editor.selection = new Selection(new Position(anchor.line, anchorLineLength), new Position(active.line, 0));
      else if (!editor.selection.isReversed)
        editor.selection = new Selection(new Position(anchor.line, 0), new Position(active.line, activeLineLength));
    }

    const snippet: SnippetString = await build(editor, combinedOptions, editor.selection, matchIndex);
    await editor.insertSnippet(snippet, editor.selection);
  });

  context.subscriptions.push(disposable);

  // const onChangeConfigs = vscode.workspace.onDidChangeConfiguration(async ev => {
  //   if (ev.affectsConfiguration("commentBlocks.defaults")) settings = await getSettings();
  // });

  // context.subscriptions.push(onChangeConfigs);
}

export function deactivate() { }