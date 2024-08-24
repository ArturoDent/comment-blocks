import * as vscode from 'vscode';
import type { CommentBlockSettings } from './config';
import * as resolve from './resolveVariables';

type CommentBlockSettings2 = {
  lineLength: number | Array<number>,
  startText: string | Array<string>,
  endText: string | Array<string>,
  justify: string | Array<string>,
  gapLeft: number | Array<number>,
  gapRight: number | Array<number>,
  padLines: string | Array<string>,
  numberOfLines: number,
  subjects: Array<string>,
};


/**
 * Build the comment blocks, resolving any variables.
 *
 * @export build
 * @param {CommentBlockSettings} options
 * @param {string} selectedText
 * @param {vscode.Selection} selection
 * @param {number} matchIndex
 * @returns {Promise<vscode.SnippetString>}
 **/
export async function build(editor: vscode.TextEditor , options: CommentBlockSettings, selection: vscode.Selection, matchIndex: number): Promise<vscode.SnippetString> {

  // may be a multiline ${selectedText} used in the subjects[]
  if (!editor.selection.isSingleLine) options = await _expandSelection(editor, options);
  
  let multiLineClipText = false;
  
  // may be a multiline ${CLIPBOARD} used in the subjects[]
  if (options.subjects.find((el: string) => el === '${CLIPBOARD}')) ({ options, multiLineClipText } = await _expandClipboard(options));
  
  options.numberOfLines = options.subjects.length;
  
  // remove selectCurrentLine from options
  delete options?.selectCurrentLine;  
  
  // set all array settings.lengths to numberOfLines and/or fill if necessary
  const { lineLength, startText, endText, justify, gapLeft, gapRight, padLines, subjects } = await _setLengthAndFill(options);
  const numberOfLines = Math.floor(options.numberOfLines);
  
  let str = '';
  let startText2 = '';
  let endText2 = '';
  let subject = '';
  
  const specialVariable = new RegExp('\\$[\\{\\d]');
  
  for (let line = 0; line < numberOfLines; line++) {
    
    let gapLeft2 = Math.floor((gapLeft as number[])[line]);
    let gapRight2 = Math.floor((gapRight as number[])[line]);
    let lineLength2 = Math.floor((lineLength as number[])[line]);
    
    // add line to args so that lineIndex/Number will move with the comment block
    if (startText[line].search(specialVariable) !== -1)
      startText2 = await resolve.resolveVariables(startText[line], selection, matchIndex, line, "startText");
    else startText2 = startText[line];
    
    if (endText[line].search(specialVariable) !== -1)
      endText2 = await resolve.resolveVariables(endText[line], selection, matchIndex, line, "endText");
    else endText2 = endText[line];

    if (subjects[line].search(specialVariable) !== -1)
      subject = await resolve.resolveVariables(subjects[line], selection, matchIndex, line, "subjects");
    else subject = subjects[line];
    
    // don't trim if multiline selection or clipboard
    if (selection.isSingleLine && !multiLineClipText) subject = subject.trim();  //  don't do this if multiline selection
    let subjectLength = subject.length;    

    if (subjectLength === 0) {            // ignore gapLeft/Right if no subject on that line
      gapLeft2 = 0;
      gapRight2 = 0;
    }
    
    // use below if want the line lengths to match when there is a tabStop(s) or not
    // if subject is a tabstop, increase subject length by 2 for each $1, $2, etc.
    // const capGroupOnlyRE = /(?<capGroupOnly>(?<!\$)\$\{(\d)\}|(?<!\$)\$(\d))/g;
    // const capGroups = subject.match(capGroupOnlyRE);
    // if (capGroups) {
    //   padLeftLength += capGroups.length;
    //   padRightLength  += capGroups.length;
    // }
    
    // to align the ends of the padLeft fillers by adding a spacer to gapLeft instead
    const rawPadLeftLength = lineLength2 / 2 - subjectLength / 2 - gapLeft2 - startText2.length;
    
    // TODO: what if gapLeft is 0?  && (gapLeft as number[])[line] !== 0
    if (!Number.isInteger(rawPadLeftLength) && justify[line] !== "left") gapLeft2 += 1;   // only do this if multiple lines?

    let padLeftLength: number;
    let padRightLength: number;
    
    if (justify[line] === 'center' || justify[line] === '') {
      // to put the extra filler (if length is not an integer) before the gap, using ceil and floor      
      padLeftLength = Math.ceil(lineLength2/2 - subjectLength/2 - gapLeft2 - startText2.length);
      padRightLength = Math.floor(lineLength2/2 - subjectLength/2 - gapRight2 - endText2.length);
    }

    else if (justify[line] === 'left') {
      padLeftLength = 0;       // so ignored by justify LEFT
      padRightLength = Math.floor(lineLength2 - startText2.length - gapLeft2 - subjectLength  - gapRight2 - endText2.length);
    }

    else {  // if (justify[line] === 'right')
      padLeftLength = Math.ceil(lineLength2 - startText2.length - gapLeft2 - subjectLength - gapRight2 - endText2.length);
      padRightLength = 0;      // so ignored by justify RIGHT
    }
    
    str += startText2.padEnd(padLeftLength + startText2.length, padLines[line])
                      .padEnd(padLeftLength + gapLeft2 + startText2.length, ' ');
    
    str += subject.padEnd(subjectLength + gapRight2, ' ')
                  .padEnd(subjectLength + gapRight2 + padRightLength, padLines[line]);
  
    if (line === numberOfLines - 1) str += `${endText2}`;  // no newline on last line
    else str += `${endText2}\n`;
  }
  return new vscode.SnippetString(str);
}

/**
 *
 *
 * @param {string[]} subjects
 **/
// async function _expandSelection(options: CommentBlockSettings, subjects: string[]): Promise<string[]> {
async function _expandSelection(editor: vscode.TextEditor, options: CommentBlockSettings): Promise<CommentBlockSettings> {
  
  // const editor = vscode.window?.activeTextEditor;
  // if (!editor) return subjects;
  if (!editor) return options;
  
  let splitSelection: string[] = [];
  splitSelection = editor.document.getText(editor.selection).split(/\r?\n/);
      
  // get the line with ${selectedText}
  const insertAt = options.subjects.findIndex((el: string) => el === '${selectedText}');
  
  // "subjects": ["${file}", "", "${selectedText}", "", "${nextFunction}"] 
  // if there is no "${selectedText}": do nothing, the selection will be replaced by the comment block    
  if (insertAt !== -1) {
    options.subjects.splice(insertAt, 1, ...splitSelection);
    
    // const elementsToInsert = new Array(splitSelection.length).fill(options.justify[insertAt], 0);
    // options.justify.splice(insertAt, 1, ...elementsToInsert);
    // const { lineLength, startText, endText, justify, gapLeft, gapRight, padLines, subjects } = await _expandOptions(options);
    options = await _expandOptions(options, splitSelection.length, insertAt);
  }
    
  // return subjects;
  return options;
}

async function _expandOptions(options: CommentBlockSettings, selectionLength: number, insertAt: number ) {
  
  // for (let {option, value) in options) {
  // Object.entries(options).for await (const element of object) {
    
  // }
    
  for await (const option of Object.entries(options)) {
    
    if (option[0] === 'subjects' || option[0] === 'selectCurrentLine') continue;
  
    // @ts-ignore
    // if (typeof option[1] === 'string' || typeof option[1] === 'number') option[1] = [option[1]];
    if (typeof option[1] !== 'object') option[1] = [option[1]];
    if ( (option[1] as (string|number)[]).length <= insertAt) continue;
    
    
    // @ts-ignore
    const elementsToInsert = new Array(selectionLength).fill(option[1][insertAt], 0);
    (option[1] as (string|number)[]).splice(insertAt, 1, ...elementsToInsert);
    
    // @ts-ignore
    // options[option[0]] = option[1];
  }
  
  return options;
}

/**
 *
 *
 * @param {CommentBlockSettings} option
 **/
async function _expandClipboard(options: CommentBlockSettings): Promise<{ options: CommentBlockSettings, multiLineClipText: boolean }> {
  
  const insertAt = options.subjects.findIndex((el: string) => el === '${CLIPBOARD}');
  let splitClipboard: string[] = [];
  let multiLineClipText = false;
  
  if (insertAt !== -1) {
    
    const clipText = await vscode.env.clipboard.readText();  
    splitClipboard = clipText.split(/\r?\n/);
    
    if (splitClipboard.length > 1) {
      options.subjects.splice(insertAt, 1, ...splitClipboard);
      multiLineClipText = true;
      
      options = await _expandOptions(options, splitClipboard.length, insertAt);
    }
  }
  
  // return { subjects2: subjects, multiLineClipText };
  return { options, multiLineClipText };
}


/**
 * Make arrays of lineLength out of all options.
 * Set any trailing values to the last value given.
 * Example: [1,2] => [1,2,3]
 * Example: ["left", "center"] => ["left", "center", "center"]
 * 
 * @param {CommentBlockSettings} options
 * @returns options
 **/
async function _setLengthAndFill(options: CommentBlockSettings2): Promise<CommentBlockSettings> {
  
  const maxLength: number = Math.floor(options.numberOfLines);
  
  for (let [option, value] of Object.entries(options)) { 
    
    if (option === 'numberOfLines') continue;
    // else if (option === 'selectCurrentLine') continue;  
    
    let newValue: Array<string | number>;
    
    if (!Array.isArray(value)) {
      newValue = Array.of(value);
    }
    else newValue = value;
    
    if (Array.isArray(newValue) && newValue.length < maxLength) {
      const oldLength = newValue.length;
      newValue.length = maxLength;
      
      if (option === 'subjects') newValue.fill("", oldLength);
      else newValue.fill(newValue[oldLength - 1], oldLength);
      
      // const key = option as keyof typeof options;
      (options as any)[option] = newValue;
    }    
  }
  
  return options;
}