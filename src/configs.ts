import * as vscode from 'vscode';

// from "properties": { "commentBlocks.defaults": {} } of package.json
export const EXTENSION_NAME = "commentBlocks";

export type CommentBlockSettings = {
  selectCurrentLine?: boolean,
  lineLength: number | Array<number>,
  startText: string | Array<string>,
  endText: string | Array<string>,
  justify: string | Array<string>,
  gapLeft: number | Array<number>,
  gapRight: number | Array<number>,
  padLines: string | Array<string>,
  subjects: Array<string>
};


export async function getSettings(doc: vscode.TextDocument): Promise<CommentBlockSettings> {
  
  const config: vscode.WorkspaceConfiguration | undefined = vscode.workspace.getConfiguration(EXTENSION_NAME,  {languageId: doc.languageId, uri: doc.uri});
  const defaults: vscode.WorkspaceConfiguration | undefined = await config.get('defaults');
  
  return {
    
    selectCurrentLine: defaults?.selectCurrentLine,
    
    lineLength: defaults?.lineLength,
    
    startText: defaults?.startText,
    endText: defaults?.endText,
    
    justify: defaults?.justify,
    
    gapLeft: defaults?.gapLeft,
    gapRight: defaults?.gapRight,
    
    padLines: defaults?.padLines,
    subjects: defaults?.subjects
  };
}

/**
 * Get the default values for each option
 *
 * @export
 **/
export function getDefaults() {  
  return {
    selectCurrentLine: true,    
    lineLength: 80,    
    startText: '${BLOCK_COMMENT_START}',
    // endText: '${BLOCK_COMMENT_END}',   // not used    
    justify: 'center',    
    gapLeft: 3,
    gapRight: 3,    
    padLines: '-',
    subjects: ["", "${selectedText}", ""]
  };
}