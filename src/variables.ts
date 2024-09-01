/**
 * @returns {Array} - all the available variables defined by this extension
 */
export function getExtensionDefinedVariables() {
  // ${default} is not visible to the user
  return ["${getTextLine:\\d+}", "${getInput}", "${default}", "${nextSymbol}", "${previousSymbol}",
    "${previousFunction}", "${nextFunction}", "${parentFunction}", "${thisFunction}"];
}


/**
 * @returns {Array} - all the available path variables
 */
export function getPathVariables () {

  return [
    "${file}", "${relativeFile}", "${fileBasename}", "${fileBasenameNoExtension}", "${fileExtname}", "${fileDirname}",
    "${fileWorkspaceFolder}", "${workspaceFolder}", "${relativeFileDirname}", "${workspaceFolderBasename}", 
    "${selectedText}", "${pathSeparator}", "${/}", "${lineIndex}", "${lineNumber}", "${CLIPBOARD}",     
    "${matchIndex}", "${matchNumber}", "${TM_SELECTED_TEXT}", 
    "${TM_LINE_INDEX}", "${TM_LINE_NUMBER}", "${CURSOR_INDEX}", "${CURSOR_NUMBER}",
    "${TM_FILENAME}", "${TM_FILENAME_BASE}", "${TM_DIRECTORY}", "${TM_FILEPATH}",
    "${RELATIVE_FILEPATH}", "${WORKSPACE_NAME}", "${WORKSPACE_FOLDER}",
  ];
}


/**
 * @returns {Array} - some of the available snippet variables, some above in pathVariables
 */
export function getSnippetVariables () {

  return [
    "${TM_CURRENT_LINE}", "${TM_CURRENT_WORD}",
    "${CURRENT_YEAR}", "${CURRENT_YEAR_SHORT}", "${CURRENT_MONTH}", "${CURRENT_MONTH_NAME}",
    "${CURRENT_MONTH_NAME_SHORT}", "${CURRENT_DATE}", "${CURRENT_DAY_NAME}", "${CURRENT_DAY_NAME_SHORT}",
    "${CURRENT_HOUR}", "${CURRENT_MINUTE}", "${CURRENT_SECOND}", "${CURRENT_SECONDS_UNIX}", "${CURRENT_TIMEZONE_OFFSET}",
    "${RANDOM}", "${RANDOM_HEX}",
    "${BLOCK_COMMENT_START}", "${BLOCK_COMMENT_END}", "${LINE_COMMENT}"
  ];
}


// TM_FILENAME The filename of the current document
// TM_FILENAME_BASE The filename of the current document without its extensions
// TM_DIRECTORY The directory of the current document
// TM_FILEPATH The full file path of the current document

// RELATIVE_FILEPATH The relative (to the opened workspace or folder) file path of the current document
// WORKSPACE_NAME The name of the opened workspace or folder
// WORKSPACE_FOLDER The path of the opened workspace or folder
