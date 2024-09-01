import * as vscode from 'vscode';
import type { CommentBlockSettings } from './configs';
import * as resolve from './resolveVariables';
// import * as utilties from './utilities';

type CommentBlockSettings2 = {
  lineLength: number | Array<number>,
  startText: string | Array<string>,
  endText: string | Array<string>,
  justify: string | Array<string>,
  gapLeft: number | Array<number>,
  gapRight: number | Array<number>,
  padLines: string | Array<string>,
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
export async function build(editor: vscode.TextEditor, options: CommentBlockSettings, selection: vscode.Selection, matchIndex: number): Promise<vscode.SnippetString> {

  let multiLineText = false;
  
  // may be a multiline ${selectedText} or ${CLIPBOARD} used in the subjects[]
  
  if (options.subjects.includes('${selectedText}')) ({ options, multiLineText } = await _expandMultilines(editor, options, "${selectedText}"));
  
  if (options.subjects.includes('${CLIPBOARD}')) ({ options, multiLineText } = await _expandMultilines(editor, options, "${CLIPBOARD}"));
  
  let numberOfLines = options.subjects.length;  // reset numberOfLines if multilines above
  
  // set all array settings.lengths to numberOfLines and/or fill if necessary
  // this updates options as well
  await _setLengthAndFill(options, numberOfLines);
  
  let str = '';
  const specialVariable = new RegExp('\\$\\{.*\\}');
  
  for (let line = 0; line < numberOfLines; line++) {
    
    // loop through all options to resolveVariables on the line
    for await (let option of Object.entries(options)) {
      
      if (option[0] === 'selectCurrentLine') continue;
      // @ts-ignore
      if (option[1][line].toString().search(specialVariable) !== -1) // typeof string
      // @ts-ignore
      options[option[0]][line] = await resolve.resolveVariables(option[1][line], selection, matchIndex, line, option[0]);
    };
    
    // set these variable names to each option[line] value
    // note the leading ',' - serves as an empty placeholder for selectCurrentLine
    let [ , lineLength, startText, endText, justify, gapLeft, gapRight, padLine, subject ] =
        Object.entries(options).map((option) => {
          if (option[0] !== 'selectCurrentLine') return (option[1] as any)[line];
        });
    
    gapLeft = Math.floor(gapLeft);
    gapRight = Math.floor(gapRight);
    lineLength = Math.floor(lineLength);
    
    // necessary because escaping out of a getInput delivers "", and you get a length from that?
    startText = startText || "";
    endText = endText || "";
    padLine = padLine || "";
    justify = justify || "";    
    
    let subjectLength = 0;
    // don't trim if multiline selection or clipBoard in subjects
    if (subject && !multiLineText) subject = subject?.trim();  // don't trim if setting subjects = longest subject + spaces
      
    if (subject) subjectLength = subject?.length;
    else subject = '';

    if (subjectLength === 0) {            // ignore gapLeft/Right if no subject on that line
      gapLeft = 0;
      gapRight = 0;
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
    const rawPadLeftLength = lineLength / 2 - subjectLength / 2 - gapLeft - startText.length;
    
    // TODO: what if gapLeft is 0?  && (gapLeft as number[])[line] !== 0
    // if (!Number.isInteger(rawPadLeftLength) && justify !== "left") gapLeft += 1;   // only do this if multiple lines?
    if (!Number.isInteger(rawPadLeftLength) && justify === "center") gapLeft += 1;   // only do this if multiple lines?
    if (gapLeft >= 2 &&!Number.isInteger(rawPadLeftLength) && justify === "right") gapLeft -= 1;   // only do this if multiple lines?
    

    let padLeftLength: number;
    let padRightLength: number;
    
    if (justify === 'center' || justify === '') {
      // to put the extra filler (if length is not an integer) before the gap, using ceil and floor      
      padLeftLength = Math.ceil(lineLength / 2 - subjectLength / 2 - gapLeft - startText.length);
      padRightLength = Math.floor(lineLength / 2 - subjectLength / 2 - gapRight - endText.length);
    }

    else if (justify === 'left') {
      padLeftLength = 0;       // so ignored by justify LEFT
      padRightLength = Math.floor(lineLength - startText.length - gapLeft - subjectLength  - gapRight - endText.length);
    }

    else {  // if (justify === 'right')  // TODO: so default ??
      padLeftLength = Math.ceil(lineLength - startText.length - gapLeft - subjectLength - gapRight - endText.length);
      padRightLength = 0;      // so ignored by justify RIGHT
    }
    
    str += startText.padEnd(padLeftLength + startText.length, padLine || ' ')
                      .padEnd(padLeftLength + gapLeft + startText.length, ' ');
    
    str += subject.padEnd(subjectLength + gapRight, ' ')
                  .padEnd(subjectLength + gapRight + padRightLength, padLine || ' ');
  
    if (line === numberOfLines - 1) str += `${endText}`;  // no newline on last line
    else str += `${endText}\n`;
  }
  return new vscode.SnippetString(str);
}


/**
 * Expand 'subjects' for each line with ${CLIPBOARD} or ${selectedText}
 * @param {vscode.TextEditor} editor
 * @param {CommentBlockSettings} options
 * @param {string} caller - ${selectedText} or ${CLIPBOARD}
 **/
async function _expandMultilines(editor: vscode.TextEditor, options: CommentBlockSettings, caller: string): Promise<{ options: CommentBlockSettings, multiLineText: boolean }> {
  
  let multiLineText = false;
  let splitText: string[] = [];
  
  // let newArr: string[] = [];
  let newArr: any[] = [];
  let inserted = 0;  // need to add the number of lines inserted to the index
  
  if (caller === '${CLIPBOARD}') {
    const clipText = await vscode.env.clipboard.readText();
    splitText = clipText.split(/\r?\n/);
  }
  else if (caller === '${selectedText}') {
    splitText = editor.document.getText(editor.selection).split(/\r?\n/);    
  }
  
  let index = 0;   // so index = the line?
  
  for await (let subject of Object.values(options.subjects)) {
    
    if (subject.includes(caller)) {
      
      newArr.push(...splitText);
      
      options = _expandOptions(options, splitText.length, index + inserted);
      
      inserted += splitText.length - 1;
      multiLineText = true;
    }
    else newArr.push(subject);
    index++;
  };
  
  options.subjects = newArr;
  return { options, multiLineText };
}



/**
 * Expand options to use ${selectedText} or ${CLIPBOARD}.
 * Fill at the same array indices as above to equal the extra lines.
 *
 * @param {CommentBlockSettings} options
 * @param {number} selectionLength - selection or clipboard length
 * @param {number} insertAt
 * @returns
 **/
function _expandOptions(options: CommentBlockSettings, selectionLength: number, insertAt: number ) {
  
  // for await (const option of Object.entries(options)) {
  for  (const option of Object.entries(options)) {
    
    let elementsToInsert;
    
    if (option[0] === 'subjects' || option[0] === 'selectCurrentLine') continue;
    
    let [ key , values2 ] = option;
    let values;
    
    if (typeof values2 !== 'object') values = [values2];
    else values = values2;
    
    if ( values.length <= insertAt) continue;
    
    // [ "${getInput}", "${default}", "${default}"]
    
    if (values[insertAt] === "${getInput}") {
      elementsToInsert = new Array(selectionLength-1).fill("${default}", 0);
      values.splice(insertAt+1, 0, ...elementsToInsert);
    }
    
    else {
      elementsToInsert = new Array(selectionLength).fill(values[insertAt], 0);
      values.splice(insertAt, 1, ...elementsToInsert);
    }
    
    Object.assign(options, new Object({ [key]: values }));
  }
  
  return options;
}


/**
 * Make arrays of lineLength out of all options.
 * Set any trailing values to the last value given.
 * Example: [1,2] => [1,2,3]
 * Example: ["left", "center"] => ["left", "center", "center"]
 * 
 * @param {CommentBlockSettings} options
 * @param {number} numberOfLines 
 * @returns options
 **/
async function _setLengthAndFill(options: CommentBlockSettings, numberOfLines: number): Promise<CommentBlockSettings> {
  
  const maxLength: number = Math.floor(numberOfLines);
  
  for (let [option, value] of Object.entries(options)) { 
    
    if (option === 'selectCurrentLine') continue;
    
    let newValue: Array<string | number>;
    
    if (!Array.isArray(value)) {
      newValue = Array.of(value as (string|number));
    }
    else newValue = value;
    
    if (Array.isArray(newValue) && newValue.length < maxLength) {
      const oldLength = newValue.length;
      newValue.length = maxLength;
      
      if (option === 'subjects') newValue.fill("", oldLength);
      else newValue.fill(newValue[oldLength - 1], oldLength);
    }
      
    (options as any)[option] = newValue;
  }
  
  return options;
}