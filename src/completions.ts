import {
  ExtensionContext, languages, Range, Position,
  CompletionItem, CompletionItemKind, SnippetString, MarkdownString
} from 'vscode';

import * as jsonc from 'jsonc-parser';  // for the language-specific comment characters


/**
 * Register a CompletionItemProvider for keybindings.json
 * @param {import("vscode").ExtensionContext} context
 */
export async function makeKeybindingsCompletionProvider (context: ExtensionContext) {
    const keybindingCompletionProvider = languages.registerCompletionItemProvider (
      { pattern: '**/keybindings.json' },  // TODO: add scheme
      {
        provideCompletionItems(document, position) {

          const linePrefix = document.lineAt(position).text.substring(0, position.character);

          let curLocation;
							
          const rootNode = jsonc.parseTree(document.getText());
          
          try {   // some kind of a parsing bug in jsonc-parser?
            curLocation = jsonc.getLocation(document.getText(), document.offsetAt(position));
          }
          catch (error) {
            // console.log(error)
          }

          if (!curLocation || curLocation.isAtPropertyKey) return undefined;
          if (curLocation.path[1] === '') return undefined;  // trying to get command/args/key/when of keybinding
          
          let thisConfig;
          let nodeValue;
          let command;
          
          if (rootNode) thisConfig = _findConfig(rootNode, document.offsetAt(position));
          if (thisConfig) nodeValue = jsonc.getNodeValue(thisConfig);
          if (nodeValue) command = nodeValue.command;

          if (!command.startsWith("comment-blocks.createBlock")) return undefined;
                   
          // curLocation.path = [26, 'args', 'replace', 1], isAtPropertyKey = false
          
          // prevents completion at "reveal": "last"|,
          if (curLocation?.previousNode && linePrefix.endsWith(`"${ curLocation.previousNode.value }"`)) return undefined;
          
          const props = ["startText", "endText", "subjects"];
          
          if (props.includes(curLocation.path[2] as string) && !curLocation.isAtPropertyKey) {            
            const argCompletions = _completeArgs(linePrefix, position, curLocation.path[2] as string);
            if (argCompletions) return argCompletions;
            else return undefined;
          }
					return undefined;
				}
			},
		'$', '{'   // trigger intellisense/completion
	);

  context.subscriptions.push(keybindingCompletionProvider);
  return keybindingCompletionProvider;
};


/**
 * Register a CompletionItemProvider for keybindings.json
 * @param {import("vscode").ExtensionContext} context
 */
export async function makeSettingsCompletionProvider (context: ExtensionContext) {
  const settingsCompletionProvider = languages.registerCompletionItemProvider (
    { pattern: '**/settings.json' },  // TODO: add scheme
    {
      provideCompletionItems(document, position) {

        const linePrefix = document.lineAt(position).text.substring(0, position.character);

        let curLocation;
            
        const rootNode = jsonc.parseTree(document.getText());
        
        try {   // some kind of a parsing bug in jsonc-parser?
          curLocation = jsonc.getLocation(document.getText(), document.offsetAt(position));
        }
        catch (error) {
          // console.log(error)
        }

        if (!curLocation || curLocation.isAtPropertyKey) return undefined;
        if (curLocation.path[1] === '') return undefined;  // trying to get command/args/key/when of keybinding
        
        let thisConfig;
        
        if (rootNode) thisConfig = _findConfig(rootNode, document.offsetAt(position));
        if (thisConfig?.children && thisConfig?.children[0]?.value  !== "commentBlocks.defaults") return undefined;
                 
        const triggerCharacters: boolean = linePrefix.endsWith('$') || linePrefix.endsWith('${');
        if (!curLocation?.previousNode || !triggerCharacters) return undefined;
        
        const props = ["startText", "endText", "subjects"];  // only these get variable completions
        
        if (props.includes(curLocation.path[1] as string) && !curLocation.isAtPropertyKey) {            
          const argCompletions = _completeArgs(linePrefix, position, curLocation.path[1] as string);
          if (argCompletions) return argCompletions;
          else return undefined;
        }
        return undefined;
      }
    },
  '$', '{'   // trigger intellisense/completion
);

context.subscriptions.push(settingsCompletionProvider);
return settingsCompletionProvider;
};


/**
 * Check linePrefix for completion trigger characters.
 * 
 * @param   {string} linePrefix 
 * @param   {import("vscode").Position} position 
 * @param   {string} option - startText/endText/subjects
 * @returns {Array<CompletionItem>}
 */
function _completeArgs(linePrefix: string, position: Position, option: string) {
  
// ----------  startText/endText/subjects  -----------
  if (option === 'startText' || option === 'endText' || option === 'subjects') {
    if (linePrefix.endsWith('${'))
      return [..._completeVariables(position, "${")];
    
    else if (linePrefix.endsWith('$'))
      return [..._completeVariables(position, "$")];
  }
}


/**
 * Get the keybinding where the cursor is located.
 * 
 * @param {jsonc.Node} rootNode - all parsed confogs in keybindings.json
 * @param {number} offset - of cursor position
 * @returns {jsonc.Node} - the node where the cursor is located
 */
function _findConfig(rootNode: jsonc.Node, offset: number)  {

  if (rootNode.children) {
    for (const node of rootNode.children) {
      if (node.offset <= offset && (node.offset + node.length > offset))
        return node;
    }
  }
  return undefined;
}

/**
 * Make completion items for 'filesToInclude/filesToExclude/find/replace' values starting with a '$' sign
 * 
 * @param   {import("vscode").Position} position
 * @param   {string} trigger - triggered by '$' so include its range
 * @returns {Array<CompletionItem>}
 */
function _completeVariables(position: Position, trigger: string) {

	// triggered by 1 '$', so include it to complete w/o two '$${file}'
	let replaceRange;

	if (trigger) replaceRange = new Range(position.line, position.character - trigger.length, position.line, position.character);
	else replaceRange = new Range(position, position);

  const completionItems = [
    
    _makeValueCompletionItem("${selectedText}", replaceRange, "", "01", "The **first** selection in the current editor. Same as **${TM_SELECTED_TEXT}**."),
    _makeValueCompletionItem("${TM_SELECTED_TEXT}", replaceRange, "", "011", "The **first** selection in the current editor. Same as **${selectedText}**."),
    
    _makeValueCompletionItem("${CLIPBOARD}", replaceRange, "", "02", "The clipboard contents."),
    
    _makeValueCompletionItem("${getInput}", replaceRange, "", "03", "Open an input dialog to get this text."),
		_makeValueCompletionItem("${thisFunction}", replaceRange, "", "04", "The current function name."),
		_makeValueCompletionItem("${parentFunction}", replaceRange, "", "05", "The current parent function's name."),
		_makeValueCompletionItem("${nextFunction}", replaceRange, "", "06", "The next function name below the cursor."),
		_makeValueCompletionItem("${previousFunction}", replaceRange, "", "07", "The previous function name above the cursor."),
    _makeValueCompletionItem("${nextSymbol}", replaceRange, "", "08", "The next symbol name below the cursor - may include variables, functions, etc."),
		_makeValueCompletionItem("${previousSymbol}", replaceRange, "", "09", "The preevious symbol name above the cursor - may include variables, functions, etc"),
		_makeValueCompletionItem("${getTextLine:\\d+}", replaceRange, "", "10", "The text at line n, 0-based."),
    
		_makeValueCompletionItem("${file}", replaceRange, "", "11", "The full path (`/home/UserName/myProject/folder/test.txt`) of the current editor. Same as **${TM_FILEPATH}**."),
		_makeValueCompletionItem("${TM_FILEPATH}", replaceRange, "", "111", "The full path (`/home/UserName/myProject/folder/test.txt`) of the current editor. Same as **${file}**."),

    _makeValueCompletionItem("${relativeFile}", replaceRange, "", "12", "The path of the current editor relative to the workspaceFolder (`folder/file.ext`). Same as **${RELATIVE_FILEPATH}**."),
    _makeValueCompletionItem("${RELATIVE_FILEPATH}", replaceRange, "", "121", "The path of the current editor relative to the workspaceFolder (`folder/file.ext`). Same as **${relativeFile}**."),

    _makeValueCompletionItem("${fileBasename}", replaceRange, "", "13", "The basename (`file.ext`) of the current editor. Same as **${TM_FILENAME}**."),
		_makeValueCompletionItem("${TM_FILENAME}", replaceRange, "", "131", "The basename (`file.ext`) of the current editor. Same as **${fileBasename}**."),
    
		_makeValueCompletionItem("${fileBasenameNoExtension}", replaceRange, "", "14", "The basename  (`file`) of the current editor without its extension. Same as **${TM_FILENAME_BASE}**."),
		_makeValueCompletionItem("${TM_FILENAME_BASE}", replaceRange, "", "141", "The basename  (`file`) of the current editor without its extension. Same as **${fileBasenameNoExtension}**."),

    _makeValueCompletionItem("${fileExtname}", replaceRange, "", "15", "The extension (`.ext`) of the current editor."),

		_makeValueCompletionItem("${fileDirname}", replaceRange, "", "16", "The full path of the current editor's parent directory. Same as **${TM_DIRECTORY}**."),
		_makeValueCompletionItem("${TM_DIRECTORY}", replaceRange, "", "161", "The full path of the current editor's parent directory. Same as **${fileDirname}**."),

    _makeValueCompletionItem("${relativeFileDirname}", replaceRange, "", "17", "The path of the current editor's parent directory relative to the workspaceFolder."),

		_makeValueCompletionItem("${fileWorkspaceFolder}", replaceRange, "", "18", "The full path of the current editor's workspaceFolder."),
		_makeValueCompletionItem("${workspaceFolder}", replaceRange, "", "19", "The full path (`/home/UserName/myProject`) to the currently opened workspaceFolder."),
		_makeValueCompletionItem("${workspaceFolderBasename}", replaceRange, "", "20", "The name (`myProject`) of the workspaceFolder."),
		// _makeValueCompletionItem("${WORKSPACE_NAME}", replaceRange, "", "201", "The name (`myProject`) of the workspaceFolder."),
		_makeValueCompletionItem("${WORKSPACE_FOLDER}", replaceRange, "", "202", "The name (`myProject`) of the workspaceFolder."),

    _makeValueCompletionItem("${pathSeparator}", replaceRange, "", "21", "`/` on linux/macOS, `\\` on Windows."),
    _makeValueCompletionItem("${/}", replaceRange, "", "22", "`/` on linux/macOS, `\\` on Windows.  Same as ${pathSeparator}."),
    
    _makeValueCompletionItem("${lineIndex}", replaceRange, "", "23", "The line number of the **first** cursor in the current editor, lines start at 0. Same as **${TM_LINE_INDEX}**."),
    _makeValueCompletionItem("${TM_LINE_INDEX}", replaceRange, "", "231", "The line number of the **first** cursor in the current editor, lines start at 0. Same as **${lineIndex}**."),
    
		_makeValueCompletionItem("${lineNumber}", replaceRange, "", "24", "The line number of the **first** cursor in the current editor, lines start at 1. Same as **${TM_LINE_NUMBER}**."),
		_makeValueCompletionItem("${TM_LINE_NUMBER}", replaceRange, "", "241", "The line number of the **first** cursor in the current editor, lines start at 1. Same as **${lineNumber}**."),

    _makeValueCompletionItem("${matchIndex}", replaceRange, "", "25", "The 0-based find match index. Is this the first, second, etc. match? Same as **${CURSOR_INDEX}**."),
    _makeValueCompletionItem("${CURSOR_INDEX}", replaceRange, "", "251", "The 0-based find match index. Is this the first, second, etc. match? Same as **${matchIndex}**."),
    
    _makeValueCompletionItem("${matchNumber}", replaceRange, "", "26", "The 1-based find match index. Is this the first, second, etc. match? Same as **${CURSOR_NUMBER}**."),
    _makeValueCompletionItem("${CURSOR_NUMBER}", replaceRange, "", "261", "The 0-based find match index. Is this the first, second, etc. match? Same as **${matchNumber}**."),
	
    _makeValueCompletionItem("${TM_CURRENT_LINE}", replaceRange, "", "27", "The entire line the cursor is on."),
    _makeValueCompletionItem("${TM_CURRENT_WORD}", replaceRange, "", "28", "The word at the cursor."),
    
    _makeValueCompletionItem("${CURRENT_YEAR}", replaceRange, "", "28", "The current year"),
    _makeValueCompletionItem("${CURRENT_YEAR_SHORT}", replaceRange, "", "28", "The current year's last two digits"),
    _makeValueCompletionItem("${CURRENT_MONTH}", replaceRange, "", "28", "The month as two digits (example '02')."),
    _makeValueCompletionItem("${CURRENT_MONTH_NAME}", replaceRange, "", "28", "The full name of the month (example 'July')."),
    _makeValueCompletionItem("${CURRENT_MONTH_NAME_SHORT}", replaceRange, "", "28", "The short name of the month (example 'Jul')"),
    _makeValueCompletionItem("${CURRENT_DATE}", replaceRange, "", "28", "The day of the month as two digits (example '08')."),
    _makeValueCompletionItem("${CURRENT_DAY_NAME}", replaceRange, "", "28", "The name of day (example 'Monday')."),
    _makeValueCompletionItem("${CURRENT_DAY_NAME_SHORT}", replaceRange, "", "28", "The short name of the day (example 'Mon')."),
    _makeValueCompletionItem("${CURRENT_HOUR}", replaceRange, "", "28", "The current hour in 24-hour clock format."),
    _makeValueCompletionItem("${CURRENT_MINUTE}", replaceRange, "", "28", "The current minute as two digits."),
    _makeValueCompletionItem("${CURRENT_SECOND}", replaceRange, "", "28", "The current second as two digits."),
    _makeValueCompletionItem("${CURRENT_SECONDS_UNIX}", replaceRange, "", "28", "The number of seconds since the Unix epoch."),
    _makeValueCompletionItem("${CURRENT_TIMEZONE_OFFSET}", replaceRange, "", "28", "The timezone offset for the local time. In the form of '+7:00:00' or '-7:00:00'."),
    
    _makeValueCompletionItem("${RANDOM}", replaceRange, "", "28", "Six random Base-10 digits."),
    _makeValueCompletionItem("${RANDOM_HEX}", replaceRange, "", "28", "Six random Base-16 digits."),  
  ];

	return completionItems;
}

/**
 * From a string input make a CompletionItemKind.Property
 *
 * @param   {string} value
 * @param   {Range} replaceRange
 * @param   {string} defaultValue - default value for this option
 * @param   {string} sortText - sort order of item in completions
 * @param   {string} documentation - markdown description of each item
 * @param   {boolean} [invoked] - was this invoked by Ctrl+Space
 * @returns {CompletionItem} - CompletionItemKind.Text
 */
function _makeValueCompletionItem(value: string, replaceRange: Range, defaultValue: string, sortText: string, documentation: string) {

  let item;
  
  item = new CompletionItem(value, CompletionItemKind.Property);
  item.insertText = value;  // inserting a SnippetString is resolving variables like ${file}, etc.
  item.range = replaceRange;
  
  if (defaultValue) item.detail = `default: ${ defaultValue }`;

  if (sortText) item.sortText = sortText;
  // if (documentation) item.documentation = documentation;
  if (documentation) item.documentation = new MarkdownString(documentation);
  
  // to selectthe 'n' to be replaced
  if (value === "${getTextLines:n}") {
    item.insertText = new SnippetString("\\${getTextLines:\$\{1:n\}}");
  }
 
	return item;
}