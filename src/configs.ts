import { workspace, WorkspaceConfiguration, TextDocument } from 'vscode';
import { CommentBlockSettings } from './types';


// from "properties": { "commentBlocks.defaults": {} } of package.json
const EXTENSION_NAME = "commentBlocks";


/**
 * Get the merged settings for the defaults.
 * Language-overriddable.
 *
 * @export
 **/
export async function getSettings(doc: TextDocument): Promise<CommentBlockSettings> {

  const config: WorkspaceConfiguration | undefined = workspace.getConfiguration(EXTENSION_NAME,  {languageId: doc.languageId, uri: doc.uri});
  const defaults: WorkspaceConfiguration | undefined = await config.get('defaults');

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