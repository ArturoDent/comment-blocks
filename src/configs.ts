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


export async function getSettings(): Promise<CommentBlockSettings> {

  const config: vscode.WorkspaceConfiguration | undefined = vscode.workspace.getConfiguration(EXTENSION_NAME);
  const defaults: vscode.WorkspaceConfiguration | undefined = await config.get('defaults');
  
  let endTextDefault = (defaults?.startText === "${LINE_COMMENT}") ? "${LINE_COMMENT}" : "${BLOCK_COMMENT_END}";

  return {   // return any settings or their default values
    
    selectCurrentLine: (defaults?.selectCurrentLine === false) ? false : true,
    
    lineLength: defaults?.lineLength               || 80,
    
    startText: defaults?.startText                 || '${BLOCK_COMMENT_START}',
    endText: defaults?.endText                     || endTextDefault,
    
    justify: defaults?.justify                     || 'center',
    
    gapLeft: defaults?.gapLeft                     ||  3,
    gapRight: defaults?.gapRight                   ||  3,
    
    padLines: defaults?.padLines                   ||  '-',
    subjects: defaults?.subjects                   ||  ["", "${selectedText}", ""]
  };
}