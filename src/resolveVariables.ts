import { window, workspace, env, commands, Selection, DocumentSymbol, SymbolKind } from 'vscode';

import * as regexp from './regex';
import * as path from 'path';        
import * as os from 'os';     
import * as utilities from './utilities';

type GroupNames = {
  pathCaseModifier?: any,
  path?: any,
  snippetVars?: any,
  caseModifier?: any,
  capGroup?: any
};

// TODO:this has to be cleared each time, in the command registration or block()
const getInputDefaults = {
  lineLength: "",
  startText: "",
  endText: "",
  justify: "",
  gapLeft: "",
  gapRight: "",
  padLines: ""
};


/**
 * Build the replaceString by updating the setting 'replaceValue' to
 * account for case modifiers, capture groups and conditionals
 *
 * @param {string} resolve - text to resolve
 * @param {import("vscode").Selection} selection - the current selection
 * @param {number} matchIndex - which match is it
 * @param {number} line - increment to original line number
 * @param {string} caller - which option (e.g., "subjects", "gapLeft") is being resolved
 * @returns {Promise<string>} - the resolved string
 */
export async function resolveVariables (resolve: string, selection: Selection, matchIndex: number, line: number, caller: string): Promise<string> {
  
  const document = window.activeTextEditor?.document;
  if (!document) return '';
  if (!resolve.length) return '';
  
  let replaceValue = resolve;
  
  const variable = new RegExp('\\$\\{');
  if (replaceValue.search(variable) === -1) return replaceValue;  // doesn't contain '${'

  let resolved = replaceValue;
  let re;
  let groupNames: GroupNames;
  
  
  // --------------------  special variables -------------------------------------------
  
  // have this first so any variables in ${selectedText} or ${CLIPBOARD} will get resolved below!
  re = regexp.specialVariablesRE;

  resolved = await utilities.replaceAsync2(resolved, re, resolveSpecialVariables, selection, matchIndex, caller, line);
  // --------------------  special variables ----------------------------------------------
  
  // --------------------  extension-defined variables -------------------------------------------
  
  // have this second so any variables in ${getInput} will get resolved below!
  // Including other extension - defined variables!!
  re = regexp.extensionGlobalRE;

  resolved = await utilities.replaceAsync2(resolved, re, resolveExtensionDefinedVariables, selection, matchIndex, caller, line);
  // --------------------  extension-defined variables ----------------------------------------------
  
  // --------------------  path variables -----------------------------------------------------------
 
  re = regexp.pathGlobalRE;
  
  // @@@ts-ignore
  resolved = await utilities.replaceAsync(resolved, re, async function (match: any, p1: any, p2: any) {
    
    const variableToResolve = await _resolvePathVariables(match, selection, matchIndex, line);
    groupNames = {
      pathCaseModifier: p1,
      path: p2
    };
    
    if (!groupNames.pathCaseModifier) return variableToResolve;
    else return _applyCaseModifier(groupNames, variableToResolve);
  }) as string;
  // --------------------  path variables -----------------------------------------------------------
  
  
 // --------------------  snippet variables -----------------------------------------------------------
 
  re = regexp.snippetRE;
  
  // @@@ts-ignore  
  resolved = await utilities.replaceAsync(resolved, re, async function (match: any, p1: any, p2: any) {
    const variableToResolve = await _resolveSnippetVariables(match, selection);
    groupNames = {
      pathCaseModifier: p1,
      snippetVars: p2
    };
    if (!groupNames.pathCaseModifier) return variableToResolve;
    else return _applyCaseModifier(groupNames, variableToResolve);
  }) as string;
  // --------------------  snippet variables -----------------------------------------------------------

  return resolved;
};


/**
 * Resolve the special variables, like ${nextFunction}, etc.
 * 
 * @param {string} variableToResolve - the 
 * @param {string} caller - which option to get the input for 
 * @param {number} line - which line number of the block comment
 * @returns {Promise<strin|numberg>} - the resolved extension-defined variable
 */
async function _resolveExtensionDefinedVariables (variableToResolve: string, caller: string, line: number) {
  
  const editor = window.activeTextEditor;
  if (!editor) return variableToResolve;
  const document = window.activeTextEditor?.document;
  if (!document) return variableToResolve;
  
  if (typeof variableToResolve !== 'string') return variableToResolve;
  
  let resolved = variableToResolve;
  
  const namedGroups = resolved?.match(regexp.pathCaseModifierRE)?.groups;
  if (!namedGroups) return variableToResolve;

  switch (namedGroups.vars) {
  
    // NOT coming from "subjects": "${getInput"
    
    case "${getInput}": case "${ getInput }":
      let input = await utilities.getInput(caller, line);
      // input = eval("[" + input + "]");  or Function
      if (input || input === '')  // accept inputBox with nothing in it = ''
        resolved = input;
      else {
        resolved = '';
      }
      getInputDefaults[caller as keyof typeof getInputDefaults] = resolved;
      break;
      
    case "${default}": case "${ default }":
      // if expecting a number, parseInt somewhere
      resolved = getInputDefaults[caller as keyof typeof getInputDefaults];
      break;
    
    case "${nextSymbol}": case "${ nextSymbol }":
      const symbols: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
        document.uri);
  
      if (symbols) {
        const nextSymbol = Object.values(symbols).find(symbol => {
          return symbol.range.start.isAfter(editor.selection.active);
        });
        if (nextSymbol) resolved = nextSymbol.name;
        else resolved = '';
      }
      else resolved = '';
      break;
    
    case "${previousSymbol}": case "${ previousSymbol }":
        const symbols1: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
          document.uri);
    
        if (symbols1) {
          const previousSymbol = Object.values(symbols1).find(symbol => {
            return symbol.range.start.isBefore(editor.selection.active);
          });
          if (previousSymbol) resolved = previousSymbol.name;
          else resolved = '';
        }
        else resolved = '';        
        break;
    
    case "${previousFunction}": case "${ previousFunction }":
      const symbols2: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
        document.uri);
      
      if (symbols2) {
        const thisFunction = Object.values(symbols2).findLast(symbol => {
          return symbol.kind === SymbolKind.Function && symbol.range.start.isBefore(editor.selection.active);
        });
        // handle subFunctions here?
        if (thisFunction) resolved = thisFunction.name;
        else resolved = '';
      }
      else resolved = '';
      break;
    
    case "${nextFunction}": case "${ nextFunction }":
      const symbols3: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
        document.uri);
      
      if (symbols3) {
        const thisFunction = Object.values(symbols3).find(symbol => {
          return symbol.kind === SymbolKind.Function && symbol.range.start.isAfter(editor.selection.active);
        });
        // handle subFunctions here?  make a recursive function
        if (thisFunction) resolved = thisFunction.name;
        else resolved = '';
      }
      else resolved = '';
      break;
    
    case "${parentFunction}": case "${ parentFunction }":
      const symbols4: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
        document.uri);
  
      if (symbols4) {
        const thisFunction = Object.values(symbols4).find(symbol => {
          return symbol.kind === SymbolKind.Function && symbol.range.contains(editor.selection.active);
        });
        if (thisFunction) resolved = thisFunction.name;
        else resolved = '';
      }
      else resolved = '';
      break;
    
    case "${thisFunction}": case "${ thisFunction }":
      // loop through myFunction's children (that are Functions) with contains
      const symbols5: Array<DocumentSymbol> = await commands.executeCommand('vscode.executeDocumentSymbolProvider',
        document.uri);
  
      if (symbols5) {
        const parentFunction = Object.values(symbols5).find(symbol => {
          // handles when you select beyond the range of a function
          const intersection = editor.selection.intersection(symbol.range);
          if (intersection) return symbol.kind === SymbolKind.Function && symbol.range.contains(intersection);
          else return false;
        });
        
        if (parentFunction) {
          const childFunctions: Array<DocumentSymbol> = parentFunction.children.filter((child: DocumentSymbol) => {
            return child.kind === SymbolKind.Function;
          });
        
          if (childFunctions) {  // only goes to one level deep, there could be child functions of child functions - ignored
            const myFunction = childFunctions.find(func => {
            // handles when you select beyond the range of a function
              const intersection = editor.selection.intersection(func.range);
              if (intersection) return func.range.contains(intersection);
              else return false;
            });
            if (myFunction) resolved = myFunction?.name;
            else resolved = parentFunction?.name;
          }
          else resolved = '';
        }
        else resolved = '';
      }
      else resolved = '';
      break;

    default:
      break;
  }

  return resolved;
};


/**
 * Resolve path variable(s)
 * 
 * @param {string} variableToResolve - the "filesToInclude/find/replace" value 
 * @param {Object} args -  keybinding/settings args
 * @param {string} caller - if called from a find.parseVariables() or replace or filesToInclude 
 * @param {import("vscode").Selection} selection - current selection
 * @param {number} line - bump to original line number
 * @param {number} matchIndex - which match is it
 * 
 * @returns {Promise<string>} - the resolved path variable
 */
async function _resolvePathVariables (variableToResolve: string, selection: Selection, matchIndex: number, line: number) {

  const document = window.activeTextEditor?.document;
  if (!document) return variableToResolve;
  
  if (typeof variableToResolve !== 'string') return variableToResolve;

	const filePath = document.uri.path;
  let relativePath;
  
  if (workspace.workspaceFolders) {
    relativePath = workspace?.asRelativePath(document.uri, false);
  }

  let resolved = variableToResolve; 
  const wsFolder = workspace?.getWorkspaceFolder(document.uri); 
  const namedGroups = resolved?.match(regexp.pathCaseModifierRE)?.groups;

  switch (namedGroups?.vars) {    

    // file = C:\Users\Mark\OneDrive\TestMultiRoot\test.txt
    // TM_FILEPATH = C:\Users\Mark\OneDrive\TestMultiRoot\test.txt
    // TM_FILEPATH = C:\Users\Mark\OneDrive\BuildSACC\Authors\Aruba.txt
    case "${file}":  case "${ file }": case "${TM_FILEPATH}":  case "${ TM_FILEPATH }":
      if (os.type() === "Windows_NT") resolved = filePath?.substring(4);
      else resolved = filePath;
      break;

    // relativeFile = test.txt
    // RELATIVE_FILEPATH = test.txt
    // relativeFile = Authors\Aruba.txt
    // RELATIVE_FILEPATH = Authors\Aruba.txt
    case "${relativeFile}":	 case "${ relativeFile }": case "${RELATIVE_FILEPATH}":	 case "${ RELATIVE_FILEPATH }":
      resolved = workspace?.asRelativePath(document.uri, false);
      break;

    // fileBasename = test.txt
    // TM_FILENAME = test.txt
    // TM_FILENAME = Aruba.txt
    case "${fileBasename}": case "${ fileBasename }": case "${TM_FILENAME}": case "${ TM_FILENAME }":
      if (relativePath) resolved = path.basename(relativePath);
      break;
    
    // fileBasenameNoExtension = test
    // TM_FILENAME_BASE = test
    // TM_FILENAME_BASE = Aruba
    case "${fileBasenameNoExtension}": case "${ fileBasenameNoExtension }": case "${TM_FILENAME_BASE}": case "${ TM_FILENAME_BASE }": 
      if (relativePath) resolved = path.basename(relativePath, path.extname(relativePath));
      break;
      
    // fileExtname = .txt
    case "${fileExtname}": case "${ fileExtname }":   // includes the `.` unfortunately
      if (relativePath) resolved = path.extname(relativePath);
      break;
      
    // fileDirname = C:\Users\Mark\OneDrive\TestMultiRoot
    // TM_DIRECTORY = C:\Users\Mark\OneDrive\TestMultiRoot
    // fileDirname = C:\Users\Mark\OneDrive\BuildSACC\Authors
    // TM_DIRECTORY = C:\Users\Mark\OneDrive\BuildSACC\Authors
    case "${fileDirname}": case "${ fileDirname }": case "${TM_DIRECTORY}": case "${ TM_DIRECTORY }":
      resolved = path.dirname(filePath);
      break;
    
    // fileWorkspaceFolder = C:\Users\Mark\OneDrive\TestMultiRoot
    // fileWorkspaceFolder = C:\Users\Mark\OneDrive\BuildSACC
    case "${fileWorkspaceFolder}": case "${ fileWorkspaceFolder }":
      if (wsFolder) resolved = wsFolder.uri.path;
      break;
     
    // workspaceFolder = C:\Users\Mark\OneDrive\TestMultiRoot
    // workspaceFolder = C:\Users\Mark\OneDrive\BuildSACC
    case "${workspaceFolder}": case "${ workspaceFolder }":  
      if (wsFolder) resolved = wsFolder.uri.path;      
      break;
    
    // C:\Users\Mark\OneDrive\TestMultiRoot\.vscode
    // C:\Users\Mark\OneDrive\TestMultiRoot\.vscode
    case "${WORKSPACE_FOLDER}": case "${ WORKSPACE_FOLDER }": 
      // apparently the location of TestMultiRoot.code-workspace
      const wsFile = workspace.workspaceFile;  // /c:/Users/Mark/OneDrive/TestMultiRoot/.vscode/TestMultiRoot.code-workspace
      if (wsFile) resolved = path.dirname(wsFile.fsPath);
      break;
    
    // // TestMultiRoot
    // // TestMultiRoot
    // case "${WORKSPACE_NAME}": case "${ WORKSPACE_NAME }":
    //       // below is not correct
    //   if (wsFolder) resolved = wsFolder.name;
    //   break;

    // relativeFileDirname = .
    // relativeFileDirname = Authors
    case "${relativeFileDirname}": case "${ relativeFileDirname }":
      resolved = path.dirname(workspace?.asRelativePath(document.uri, false));
      break;

    // workspaceFolderBasename = TestMultiRoot
    // workspaceFolderBasename = BuildSACC
    case "${workspaceFolderBasename}": case "${ workspaceFolderBasename }":
      if (wsFolder) resolved = path.basename(wsFolder.uri.path);
      break;
     
    // pathSeparator = \
    case "${pathSeparator}": case "${ pathSeparator }": case "${\/}": case "${ \/ }":
      resolved = path.sep;
      break;
     
    case "${matchIndex}": case "${ matchIndex }": case "${CURSOR_INDEX}": case "${ CURSOR_INDEX }":
      resolved = String(matchIndex);
      break;
     
    case "${matchNumber}": case "${ matchNumber }": case "${CURSOR_NUMBER}": case "${ CURSOR_NUMBER }":
      resolved = String(matchIndex + 1);
      break;
       
     case "${lineIndex}": case "${ lineIndex }": case "${TM_LINE_INDEX}": case "${ TM_LINE_INDEX }":   // 0-based
      // resolved = String(selection?.active?.line);
      resolved = String(selection?.active?.line + line);
      break;

    case "${lineNumber}":  case "${ lineNumber }": case "${TM_LINE_NUMBER}":  case "${ TM_LINE_NUMBER }":   // 1-based
      // resolved = String(selection?.active?.line + 1);
      resolved = String(selection?.active?.line + 1 + line);
      break;



    default:
      break;
   }

  return resolved;
};


/**
 * If the "filesToInclude/find/replace" entry uses a path variable(s) return the resolved value  
 * 
 * @param {string} variableToResolve - the "filesToInclude/find/replace" value 
 * @param {Object} args -  keybinding/settings args
 * @param {string} caller - if called from a find.parseVariables() or replace or filesToInclude 
 * @param {import("vscode").Selection} selection - current selection
 * @param {Object} groups - the current match

 * @returns {Promise<string>} - the resolved path variable
 */
async function _resolveSnippetVariables (variableToResolve: string, selection: Selection) {

  const document = window.activeTextEditor?.document;
  let comments;
  
  if (typeof variableToResolve !== 'string') return variableToResolve;

  const _date = new Date();

  let resolved = variableToResolve;

  const namedGroups = resolved?.match(regexp.pathCaseModifierRE)?.groups;

  switch (namedGroups?.vars) {
     
    case "${TM_CURRENT_LINE}": case "${ TM_CURRENT_LINE }":
      const selectionOffset = document?.offsetAt(selection.active);
      if (selectionOffset && selectionOffset >= 0) resolved = document?.lineAt(document?.positionAt(selectionOffset).line).text || resolved;
    break; 

    case "${TM_CURRENT_WORD}": case "${ TM_CURRENT_WORD }":
      const wordRange = document?.getWordRangeAtPosition(selection?.active);
      const text = document?.getText(wordRange);
      if (text) resolved = text;
      break;
     
    case "${CURRENT_YEAR}": case "${ CURRENT_YEAR }":
      resolved = String(_date?.getFullYear());
      break;
     
    case "${CURRENT_YEAR_SHORT}": case "${ CURRENT_YEAR_SHORT }":
      resolved = String(_date?.getFullYear()).slice(-2);
      break;
     
    case "${CURRENT_MONTH}": case "${ CURRENT_MONTH }":
      resolved = String(_date?.getMonth().valueOf() + 1).padStart(2, '0');
      break;
     
    case "${CURRENT_MONTH_NAME}": case "${ CURRENT_MONTH_NAME }":
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      resolved = monthNames[_date?.getMonth()];
      break;
     
    case "${CURRENT_MONTH_NAME_SHORT}": case "${ CURRENT_MONTH_NAME_SHORT }":
      const monthNamesShort = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      resolved = monthNamesShort[_date?.getMonth()];
      break;
     
    case "${CURRENT_DATE}": case "${ CURRENT_DATE }":
      resolved = String(_date?.getDate()?.valueOf()).padStart(2, '0');
      break;
     
    case "${CURRENT_DAY_NAME}": case "${ CURRENT_DAY_NAME }":
      const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
      resolved = dayNames[_date?.getDay()];
      break;
     
    case "${CURRENT_DAY_NAME_SHORT}": case "${ CURRENT_DAY_NAME_SHORT }":
      const dayNamesShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
      resolved = dayNamesShort[_date?.getDay()];
      break;
     
    case "${CURRENT_HOUR}": case "${ CURRENT_HOUR }":
      resolved = String(_date?.getHours()?.valueOf()).padStart(2, '0');
      break;
     
    case "${CURRENT_MINUTE}": case "${ CURRENT_MINUTE }":
      resolved = String(_date?.getMinutes()?.valueOf()).padStart(2, '0');
      break;
     
    case "${CURRENT_SECOND}": case "${ CURRENT_SECOND }":
      resolved = String(_date?.getSeconds()?.valueOf()).padStart(2, '0');
      break;
     
    case "${CURRENT_SECONDS_UNIX}": case "${ CURRENT_SECONDS_UNIX }":
      resolved = String(Math.floor(_date?.getTime() / 1000));
      break;
      
    // This code is thanks to https://github.com/microsoft/vscode/pull/170518 and @MonadChains
    // https://github.com/MonadChains
    case "${CURRENT_TIMEZONE_OFFSET}": case "${ CURRENT_TIMEZONE_OFFSET }":
      const currentDate = new Date();
      const rawTimeOffset = currentDate.getTimezoneOffset();
      // const sign = rawTimeOffset < 0 ? '-' : '+';
      const sign = rawTimeOffset > 0 ? '-' : '+';
      const hours = Math.trunc(Math.abs(rawTimeOffset / 60));
      const hoursString = (hours < 10 ? '0' + hours : hours);
      const minutes = Math.abs(rawTimeOffset) - hours * 60;
      const minutesString = (minutes < 10 ? '0' + minutes : minutes);
      resolved = sign + hoursString + ':' + minutesString;    
      break;
     
    case "${RANDOM}": case "${ RANDOM }":
      resolved = Math.random().toString().slice(-6);
      break;
     
    case "${RANDOM_HEX}": case "${ RANDOM_HEX }":
      resolved = Math.random().toString(16).slice(-6);
      break;
     
    case "${BLOCK_COMMENT_START}": case "${ BLOCK_COMMENT_START }":
      if (!comments) comments = await utilities.getlanguageConfigComments(resolved);
      resolved = comments?.blockComment[0] ?? "";  
      break;
     
    case "${BLOCK_COMMENT_END}": case "${ BLOCK_COMMENT_END }":
      if (!comments) comments = await utilities.getlanguageConfigComments(resolved);
      resolved = comments?.blockComment[1] ?? "";  
      break;
     
    case "${LINE_COMMENT}": case "${ LINE_COMMENT }":
      if (!comments) comments = await utilities.getlanguageConfigComments(resolved);
      resolved = comments?.lineComment ?? "";      
      break;
     
    default:
      break;
   }

  return resolved;
};

/**
 * Resolve variables defined by this extension and applyCaseModifier().
 *
 * @param {string} replaceValue
 * @param {string} caller - 
 * @param {number} line - 
 * @returns {Promise<string>} - the resolved string
 */
export async function resolveExtensionDefinedVariables(replaceValue: string, caller: string, line: number) {

  if (replaceValue === "") return replaceValue;  
  let re = regexp.extensionNotGlobalRE;

  if (replaceValue !== null) {
   
   let resolved = await _resolveExtensionDefinedVariables(replaceValue, caller, line );
   const found = replaceValue.match(re);
   
   if (!found || !found.groups?.caseModifier) return resolved;
   else return _applyCaseModifier(found.groups, resolved);
  }
}

/**
 * Resolve variables defined by this extension and applyCaseModifier().
 *
 * @param {string} replaceValue
 * @returns {Promise<string>} - the resolved string
 */
export async function resolveSpecialVariables(replaceValue: string) {

  if (replaceValue === "") return replaceValue;  
  let re = regexp.pathCaseModifierRE;

  if (replaceValue !== null) {
   
   let resolved = await _resolveSpecialVariables(replaceValue);
   const found = replaceValue.match(re);
   
   if (!found || !found.groups?.caseModifier) return resolved;
   else return _applyCaseModifier(found.groups, resolved);
  }
}


/**
 * Resolve the special variables, like ${nextFunction}, etc.
 * 
 * @param {string} variableToResolve - the 
 * @returns {Promise<strin|numberg>} - the resolved extension-defined variable
 */
async function _resolveSpecialVariables (variableToResolve: string) {
  
  const editor = window.activeTextEditor;
  if (!editor) return variableToResolve;
  const document = window.activeTextEditor?.document;
  if (!document) return variableToResolve;
  
  if (typeof variableToResolve !== 'string') return variableToResolve;
  
  let resolved = variableToResolve;
  
  const namedGroups = resolved?.match(regexp.pathCaseModifierRE)?.groups;
  if (!namedGroups) return variableToResolve;

  switch (namedGroups.vars) {
  
    // snippet only
    case "${CLIPBOARD}": case "${ CLIPBOARD }":
      resolved = await env.clipboard.readText();    // need to make function async
      break;
    
    case "${selectedText}": case "${ selectedText }": case "${TM_SELECTED_TEXT}": case "${ TM_SELECTED_TEXT }":
      let selection = editor.selection;
      
      // if (!selection && window.activeTextEditor) selection = window.activeTextEditor.selection;
      
      if (selection.isEmpty) {
        const wordRange = document?.getWordRangeAtPosition(selection.start);
        if (wordRange) resolved = document?.getText(wordRange);
        else resolved = '';
      }
      else resolved = document?.getText(selection);
      break;
    
    default:
      break;
  }

  return resolved;
};


/**
 * Apply case modifier, like '\\U' to capture groups $1, etc..
 * @param {Object} namedGroups
 * @param {string} resolvedPathVariable
 * @returns {string} - case-modified text
 */
function _applyCaseModifier(namedGroups: any, resolvedPathVariable: string): string {

  let resolved = resolvedPathVariable;
  
  if (namedGroups?.path && namedGroups?.path.search(/\$\{\s*(line|match)(Index|Number)\s*\}/) !== -1) {
    return resolvedPathVariable;
  }
  
  switch (namedGroups?.caseModifier || namedGroups?.pathCaseModifier || namedGroups) {
  
    case "\\U":
      resolved = resolved?.toLocaleUpperCase();
      break;

    case "\\u":
      resolved = resolved[0]?.toLocaleUpperCase() + resolved?.substring(1);
      break;

    case "\\L":
      resolved = resolved?.toLocaleLowerCase();
      break;

    case "\\l":
      resolved = resolved[0]?.toLocaleLowerCase() + resolved?.substring(1);
      break;

    default:
      break;
  }
  return resolved;
}