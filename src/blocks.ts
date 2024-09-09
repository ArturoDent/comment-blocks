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
  subjects: Array<string>
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

  if (typeof options.subjects === 'string') options.subjects = [options.subjects];
  
  // may be a multiline ${selectedText} or ${CLIPBOARD} used in the subjects[]
  // _expandMultilines also calls _removeCommonLeadingWhiteSpace()
  
  const hasSelectedTextVariable = options.subjects.some(subject => subject.includes("${selectedText}"));
  const hasClipBoardVariable = options.subjects.some(subject => subject.includes("${CLIPBOARD}"));
  
  // only do if multiline selection or clipboard
  // if (hasSelectedTextVariable) await _expandMultilines(editor, options, "${selectedText}");  
  if (hasSelectedTextVariable && !selection.isSingleLine) await _expandMultilines(editor, options, "${selectedText}");  
  if (hasClipBoardVariable) {
    const clipText = await vscode.env.clipboard.readText();
    if(clipText.split(/\r?\n/).length > 1) await _expandMultilines(editor, options, "${CLIPBOARD}");
  }
  
  let numberOfLines = options.subjects.length;  // reset numberOfLines if multilines above
  
  // set all array settings.lengths to numberOfLines and/or fill if necessary
  // this updates options as well
  await _setLengthAndFill(options, numberOfLines);
  
  const specialVariable = new RegExp('\\$\\{.*\\}');  // look for '${...}' to resolve

  for (let line = 0; line < numberOfLines; line++) {
    
    // loop through all options to resolveVariables on the line
    for await (let option of Object.entries(options)) {
      
      if (option[0] === 'selectCurrentLine') continue;
      // was ignored
      if ((option as unknown as string[])[1][line].toString().search(specialVariable) !== -1) {  // typeof string
        
        // was ignored
        var resolved = await resolve.resolveVariables((option as unknown as string[])[1][line], selection, matchIndex, line, option[0]);
        // @ts-ignore
        (options as unknown as string[])[option[0]][line] = resolved === undefined ? '' : resolved;
      }
    };
  }
  
  // updates options.subjects
  // set each justify group to the longest length subject by padding end with spaces
  _equalizeSubjectLengths(options);
  
  let str = '';
  
  for (let line = 0; line < numberOfLines; line++) {
    
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
    
    // if startText "${LINE_COMMENT}"
    // endText = (startText?.startsWith("${LINE_COMMENT}")) ? "${LINE_COMMENT}" : "${BLOCK_COMMENT_END}";
    
    
    let subjectLength = 0;
    // don't trim
      
    if (subject) subjectLength = subject?.length;
    else subject = '';

    if (subjectLength === 0) {            // ignore gapLeft/Right if no subject on that line
      gapLeft = 0;
      gapRight = 0;
    }

    let padLeftLength: number;
    let padRightLength: number;
    
    if (justify === 'left') {
      padLeftLength = 0;       // so ignored by justify LEFT
      padRightLength = Math.floor(lineLength - startText.length - gapLeft - subjectLength  - gapRight - endText.length);
    }

    else if (justify === 'right') {  
      padLeftLength = Math.ceil(lineLength - startText.length - gapLeft - subjectLength - gapRight - endText.length);
      padRightLength = 0;      // so ignored by justify RIGHT
    }
    
    else  {  // if (justify === 'center' || justify === '')
      // to put the extra filler (if length is not an integer) before the gap, using ceil and floor      
      padLeftLength = Math.ceil(lineLength / 2 - subjectLength / 2 - gapLeft - startText.length);
      padRightLength = Math.floor(lineLength / 2 - subjectLength / 2 - gapRight - endText.length);
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
 * 
 * Side effect: updates options.subjects
 * 
 * @param {vscode.TextEditor} editor
 * @param {CommentBlockSettings} options
 * @param {string} caller - ${selectedText} or ${CLIPBOARD}
 **/
async function _expandMultilines(editor: vscode.TextEditor, options: CommentBlockSettings, caller: string): Promise<void> {
  
  let splitText: string[] = [];  
  let newArr: any[] = [];
  let inserted = 0;  // need to add the number of lines inserted to the index
  
  // if (caller === '${CLIPBOARD}') {
  //   const clipText = await vscode.env.clipboard.readText();
  //   splitText = clipText.split(/\r?\n/);
  // }
  // else if (caller === '${selectedText}') {
  //   splitText = editor.document.getText(editor.selection).split(/\r?\n/);
  // }
    
  // splitText = _removeCommonLeadingWhiteSpace(splitText);  // do even if splitText.length = 1
  
  // if an empty line is in splitText, make it = " " with a space (so it isn't padded straight across)
  // splitText = splitText.map(line => line || " ");  
  
    // if (subject.match(/\\U\$\{selectedText\}/g))   //  no access to 
    // splitText = splitText.map(line => line.toLocaleUpperCase());  
  
  let index = 0;
  
  const pathGlobalRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<path>\\$\\{selectedText\\}|\\$\\{CLIPBOARD\\})`, 'g');
  
  for await (let subject of Object.values(options.subjects)) {
    
    if (subject.includes(caller)) {
      
      const match = subject.match(pathGlobalRE);  // should always be a match but typescript complains      
      if (!match) return;  // so options.subjects unchanged
      
      // just resolve the \\U${selectedText} or \\L${CLIPBOARD} part of the subject
      // don't care about the 0 arguments below as they don't impact selectedText/clipBoard resolution
      let resolved = await resolve.resolveVariables(match[0], editor.selection, 0, 0, caller);
      splitText = resolved.split(/\r?\n/);
      splitText = _removeCommonLeadingWhiteSpace(splitText);  // do even if splitText.length = 1
      splitText = splitText.map(line => line || " ");  
      
      // addd other text that may appear on the line like "my function: ${selectedText}"
      // or "${thisFunction} \\U${selectedText}"   subject.match(/\\U\$\{selectedText\}/g)
      splitText[0] = subject.replaceAll(match[0], splitText[0]);  
      
      newArr.push(...splitText);
      
      _expandOptions(options, splitText.length, index + inserted);
      
      inserted += splitText.length - 1;
    }
    else newArr.push(subject);
    index++;
  };
  
  options.subjects = newArr;
}


/**
 * Find and remove any common leading whitespace from all members of the splitText (from selectedText or CLIPBOARD)
 *
 * @param {string[]} splitText
 * @returns {string[]} - with common leading whitespace removed
 **/
function _removeCommonLeadingWhiteSpace(splitText: string[]): string[] {
  
  // ignore empty lines (no white space) in the splitText
  
  if (splitText.length === 1) {
    splitText[0] = splitText[0].trim();
    return splitText;
  }
    
  else {
    let reducedSplitText: string[] = [];
    const wsRE = new RegExp("^(\\s*)", "m");  // whiteSpacce regex
    let minimum: number;
    let match;
    
    // get the first nonEmpty line, so don't set minimum to 0 beause the line = ''
    const firstNonEmptyLine = splitText.find(line => line.length);
    if (firstNonEmptyLine) match = firstNonEmptyLine.match(wsRE);
    else return splitText;  // there are no nonEmpty lines
    
    if (match) minimum = match[0].length;
    else return splitText;      // no whiteSpace at beginning of first nonEmpty line, so stop and return
                                // since won't be able to remove any leading whiteSpace

    splitText.forEach(line => {
      let lineLength: number;
      
      if (line.length) {    // so empty lines are not considered
        const thisLineMatch = line.match(wsRE);
        if (thisLineMatch) {
          lineLength = thisLineMatch[0].length;
          if (lineLength < minimum) {
            minimum = lineLength;
          }
        }
      }
    });
    
    const re = new RegExp(`(^\\s{${minimum}})`, "m");    
    reducedSplitText = splitText.map(line => line.replace(re, ''));
    
    return reducedSplitText;
  }
}


/**
 * Expand options to use ${selectedText} or ${CLIPBOARD}.
 * Fill at the same array indices as above to equal the extra lines.
 * 
 * Side effect: updates options
 *
 * @param {CommentBlockSettings} options
 * @param {number} selectionLength - selection or clipboard length
 * @param {number} insertAt
 * @returns void
 **/
function _expandOptions(options: CommentBlockSettings, selectionLength: number, insertAt: number ): void {
  
  for  (const option of Object.entries(options)) {
    
    let elementsToInsert;
    
    if (option[0] === 'subjects' || option[0] === 'selectCurrentLine') continue;
    
    let [ key , values2 ] = option;
    let values;
    
    if (typeof values2 !== 'object') values = [values2];
    else values = values2;
    
    if ( values.length <= insertAt) continue;
    
    // [ "${getInput}", "${default}", "${default}"]
    // expand ${getInput} => [ "${getInput}", "${default}", "${default}"] 
    // so only call getInput() once, that result will be stored and retrieved by ${default}
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
}


/**
 * Make arrays of lineLength out of all options.
 * Set any trailing values to the last value given.
 * Example: [1,2] => [1,2,3]
 * Example: ["left", "center"] => ["left", "center", "center"]
 * 
 * Side effect: updates options
 * 
 * @param {CommentBlockSettings} options
 * @param {number} numberOfLines 
 * @returns Promise<void>
 **/
async function _setLengthAndFill(options: CommentBlockSettings, numberOfLines: number): Promise<void> {
  
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
}


/**
 * Set all centered (or left or right) subjects to the length of the 
 * longest such subject by padding end with spaces - maintains indentation.
 * Do this for each contiguous group of similarly justified subjects.
 * 
 * Side effect: updates options.subjects
 * 
 * @param {CommentBlockSettings} options
 * @returns void
 **/
function _equalizeSubjectLengths(options: CommentBlockSettings): void {
  
  let justifies: ("left"|"center"|"right")[] = [];
  
  // don't loop over left/center/right if that option not used
  if ((options.justify as string[]).some(justifyOption => justifyOption === "left"))   justifies.push("left");
  if ((options.justify as string[]).some(justifyOption => justifyOption === "center")) justifies.push("center");
  if ((options.justify as string[]).some(justifyOption => justifyOption === "right"))  justifies.push("right");
  
  for (const justify of justifies) {
    
    const justifyGroups: [] = [];  // for each type of justify, all separate contiguous blocks of subjects
    const justifyGroup: [] = [];   // one block of contiguous subjects for justification and padding by its longest subject
      
    for (let subject of Object.entries(options.subjects)) {
      
      const numSubjects = options.subjects.length;      
      const lineNumber = parseInt(subject[0]);
      
      const nextSubject = options.subjects[lineNumber + 1];     // may be undefined, that's OK
      const previousSubject = options.subjects[lineNumber - 1]; // may be undefined, that's OK
      
      // filter lines by common justify first and exclude those with no subject = ""
      
      if (options.justify[lineNumber] === justify && subject[1].length) {
        
        if (lineNumber === 0 && lineNumber + 1 < numSubjects) {   // first line
          
          // next line is same justify and has a subject, i.e., not an empty line
          // subjects that are within selectedText or CLIPBOARD have already had their empty lines set to " "
          if (options.justify[lineNumber + 1] === justify && nextSubject.length) {
            (justifyGroup as [string, string][]).push(subject);
          }
        }
        
        else if (lineNumber >= 1) {
          
          if (lineNumber + 1 < numSubjects) {   // so there is a next subject
            if (options.justify[lineNumber + 1] === justify && nextSubject.length) {
              (justifyGroup as [string, string][]).push(subject);
            }
            // if not found on next line, look back at previous line
            else if (options.justify[lineNumber - 1] === justify && previousSubject.length) {
              (justifyGroup as [string, string][]).push(subject);
            }

          }
          else {  // must be on last subject, so only look back
            if (options.justify[lineNumber - 1] === justify && previousSubject.length) {
              (justifyGroup as [string, string][]).push(subject);
              if (justifyGroup.length) (justifyGroups as [string, string][]).push(Array.from(justifyGroup) as unknown as [string, string]);
            }
          }
        }
      }
      else {   // reached an empty line or different justify
        if (justifyGroup.length) (justifyGroups as [string, string][]).push(Array.from(justifyGroup) as unknown as [string, string]);
        justifyGroup.length = 0;  // reset
      }
    };
    
    // "group" will be an array of contiguous lines (same justify and not an empty line)
    justifyGroups.forEach(group=> {
      
      // the first subject
      let longestIndex = parseInt(group[0][0]);
      let len = (group[0][1] as string).length;
      
      // get the longest line and its index for each contiguous block      
      (group as []).forEach(subject => {
    
        if ((subject[1] as string).length > len) {
          len = (subject[1] as string).length;
          longestIndex = parseInt(subject[0]);
        }
      });
      
      // set others to the longest length with space padding after
      (group as []).forEach(subject => {

        const thisIndex = parseInt(subject[0]);
        if (thisIndex === longestIndex) return;    // skip the already longest line
      
        // keeps releative indentation
        options.subjects[thisIndex] = (subject[1] as string).padEnd(len, " ");  // just wow !!
      });      
    });
  }
}