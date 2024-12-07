import { env, Selection, TextEditor } from 'vscode';
import type { CommentBlockSettings } from './types';
import { resolveVariables } from './resolveVariables';


/**
 * Build the comment blocks, resolving any variables.
 *
 * @export build
 * @param options
 * @param selectedText
 * @param selection
 * @param matchIndex
 * @param leadingLength
 * @param trim
 * @returns
 **/
// ----------------------------------------   build ()   -------------------------------------------
// Caller : activate                                                                          ------
// Calls  : _expandMultilines, _setLengthAndFill, resolveVariables, _equalizeSubjectLengths   ------
// -------------------------------------------------------------------------------------------------
export async function build(editor: TextEditor, options: CommentBlockSettings, selection: Selection,
  matchIndex: number, leadingLength: number, trim: boolean,
  leadingWhitespace: number, selectCurrentLine: boolean): Promise<string> {

  if (typeof options.subjects === 'string') options.subjects = [options.subjects];

  // may be a multiline ${selectedText} or ${CLIPBOARD} used in the subjects[]
  // _expandMultilines also calls _removeCommonLeadingWhiteSpace()

  const hasSelectedTextVariable = options.subjects.some(subject => subject.includes("${selectedText}"));
  const hasClipBoardVariable = options.subjects.some(subject => subject.includes("${CLIPBOARD}"));

  // only do if multiline selection or clipboard
  if (hasSelectedTextVariable && !selection.isSingleLine) await _expandMultilines(editor, options, "${selectedText}", leadingLength);
  if (hasClipBoardVariable) {
    const clipText = await env.clipboard.readText();
    if (clipText.split(/\r?\n/).length > 1) await _expandMultilines(editor, options, "${CLIPBOARD}", leadingLength);
  }

  let numberOfLines = options.subjects.length;  // reset numberOfLines if multilines above

  // set all array settings.lengths to numberOfLines and/or fill if necessary
  // this updates options as well
  await _setLengthAndFill(options, numberOfLines);

  const specialVariable = new RegExp('\\$\\{.*\\}');  // look for '${...}' to resolve
  let subjects: string[] = [];

  for (let line = 0; line < numberOfLines; line++) {

    // loop through all options to resolveVariables on the line
    for await (let option of Object.entries(options)) {

      if (option[0] === 'selectCurrentLine' || option[0] === 'keepIndentation') continue;

      else if (option[0] === 'subjects') {
        if ((option as unknown as string[])[1][line].toString().search(specialVariable) !== -1) {
          let resolved = await resolveVariables((option as unknown as string[])[1][line], selection, matchIndex, line, option[0]);
          subjects.push(resolved);
        }
        else subjects.push((option as unknown as string[])[1][line]);
      }

      else if ((option as unknown as string[])[1][line].toString().search(specialVariable) !== -1) {  // typeof string

        var resolved = await resolveVariables((option as unknown as string[])[1][line], selection, matchIndex, line, option[0]);
        // @ts-ignore
        (options as unknown as string[])[option[0]][line] = resolved === undefined ? '' : resolved;
      }
    };
  }

  // updates options.subjects
  // set each justify group to the longest length subject by padding end with spaces
  _equalizeSubjectLengths(options);

  let str = '';
  const maxLineLength = await _getMaximumLineLength(editor, selection);
  let doTrimEnd = false;
  
  for (let line = 0; line < numberOfLines; line++) {

    // set these variable names to each option[line] value
    // note the leading ',,' = empty placeholders for selectCurrentLine and keepIndentation
    let [, , lineLength, startText, endText, justify, gapLeft, gapRight, padLine] =
      Object.entries(options).map((option) => {
        if (option[0] !== 'selectCurrentLine' && option[0] !== 'keepIndentation') return (option[1] as any)[line];
      });
    
    const reMinimum = /^minimum(\s*\+\s*(?<offset>\d\d?))?$/;
    let minimumMatch;
    
    if (typeof lineLength === 'string') minimumMatch = lineLength.match(reMinimum);
    if (minimumMatch && minimumMatch.groups?.offset) {
      const func = new Function('maxLineLength', 'minimumMatch', 'return maxLineLength + Number(minimumMatch.groups?.offset)');
      lineLength = func(maxLineLength, minimumMatch);
    }
    else if (lineLength === 'minimum') {
      lineLength = maxLineLength;
    }
    
    if (minimumMatch) {
      lineLength += startText.length + endText.length;
      doTrimEnd = true;
    }
    
    // adjust lineLength for leading whitespace when selecting text with white space ahead of it
    if (selection.isSingleLine && !selectCurrentLine && line === 0) lineLength -= leadingLength;
    
    gapLeft = Math.floor(gapLeft);
    gapRight = Math.floor(gapRight);
    lineLength = Math.floor(lineLength);

    // necessary because escaping out of a getInput delivers "", and you get a length from that?
    startText = startText || "";
    endText = endText || "";
    padLine = padLine || "";
    justify = justify || "";

    let subject: string;
    if (doTrimEnd) subject = subjects[line].trimEnd();  // only if 'minimum'
    else subject = subjects[line];
      
    let subjectLength = 0;
    const re = new RegExp(`^\\s{${leadingLength}}`, 'm');
    
    if (trim && selection.isSingleLine && selectCurrentLine) {
     subject = subject.replace(re, '');
     startText = startText.padStart(leadingLength + startText.length, ' ');
    }
    else if (trim && selection.isSingleLine && !selectCurrentLine && line !== 0) {
      subject = subject.replace(re, '');
      startText = startText.padStart(leadingLength + startText.length, ' ');
    }
    else if (!trim && !selection.isSingleLine) startText = startText.padStart(leadingLength + startText.length, ' ');


    if (subject) subjectLength = subject?.length;
    else subject = '';

    if (subjectLength === 0) {            // ignore gapLeft/Right if no subject on that line
      gapLeft = 0;
      gapRight = 0;
    }

    let padLeftLength: number;   // lengths of the padding only, not the gaps left or right
    let padRightLength: number;

    if (justify === 'left') {
      padLeftLength = 0;       // so ignored by justify LEFT
      padRightLength = Math.floor(lineLength - startText.length - gapLeft - subjectLength  - gapRight - endText.length);
    }

    else if (justify === 'right') {
      padLeftLength = Math.ceil(lineLength - startText.length - gapLeft - subjectLength - gapRight - endText.length);
      padRightLength = 0;      // so ignored by justify RIGHT

      if (minimumMatch && minimumMatch.groups?.offset) {
        padLeftLength -= Number(minimumMatch.groups?.offset);
        padRightLength += Number(minimumMatch.groups?.offset);
      }
    }

    else  {  // if (justify === 'center' || justify === '')
      // to put the extra filler (if length is not an integer) before the gap, using ceil and floor
      // TODO: unless 'minimumMatch' or minimum, how to modify for these?

      padLeftLength = Math.ceil(lineLength / 2 - subjectLength / 2 - gapLeft - startText.length);
      padRightLength = Math.floor(lineLength / 2 - subjectLength / 2 - gapRight - endText.length);
      
      // if (minimumMatch && minimumMatch.groups?.offset) {
      //   // padLeftLength -= Number(minimumMatch.groups?.offset);
      //   lineLength += Number(minimumMatch.groups?.offset);
      //   padRightLength += Number(minimumMatch.groups?.offset);
      // }
    }

    str += startText.padEnd(padLeftLength + startText.length, padLine || ' ')
                      .padEnd(padLeftLength + gapLeft + startText.length, ' ');

    str += subject.padEnd(subjectLength + gapRight, ' ')
                  .padEnd(subjectLength + gapRight + padRightLength, padLine || ' ');

    if (line === numberOfLines - 1) str += `${endText}`;  // no newline on last line
    else str += `${endText}\n`;
  }
  return str;
}


/**
 * Expand 'subjects' for each line with ${CLIPBOARD} or ${selectedText}
 *
 * Side effect: updates options.subjects
 *
 * @param editor
 * @param options
 * @param caller - ${selectedText} or ${CLIPBOARD}
 **/
async function _expandMultilines(editor: TextEditor, options: CommentBlockSettings, caller: string, leadingLength: number): Promise<void> {

  let splitText: string[] = [];
  let newArr: any[] = [];
  let inserted = 0;  // need to add the number of lines inserted to the index

  let index = 0;

  const pathGlobalRE = new RegExp(`(?<path>\\$\\{selectedText\\}|\\$\\{CLIPBOARD\\})`, 'g');

  for await (let subject of Object.values(options.subjects)) {

    if (subject.includes(caller)) {

      const match = subject.match(pathGlobalRE);  // should always be a match but typescript complains
      if (!match) return;  // so options.subjects unchanged

      // just resolve the \\U${selectedText} or \\L${CLIPBOARD} part of the subject
      // don't care about the 0 arguments below as they don't impact selectedText/clipBoard resolution
      let resolved = await resolveVariables(match[0], editor.selection, 0, 0, caller);
      splitText = resolved.split(/\r?\n/);

      const re = new RegExp(`(^\\s{${leadingLength}})`, "m");
      // remove minimum amout of whiteSpace from each line
      splitText = splitText.map(line => line.replace(re, ''));

      splitText = splitText.map(line => line || " ");

      // add other text that may appear on the line like "my function: ${selectedText}"
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

// /**
//  * Find and remove any common leading whitespace from all members of the splitText (from selectedText or CLIPBOARD)
//  *
//  * @param splitText
//  * @returns length of common leading whitespace
//  **/
// export function getCommonLeadingWhiteSpace(splitText: string[]): number {

//   let minimum: number;
//   const wsRE = new RegExp("^(\\s*)", "m");  // whiteSpace regex
//   let match;

//   // ignore empty lines (no white space) in the splitText

//   if (splitText.length === 1) {
//     // splitText[0] = splitText[0].trim();
//     // return splitText;
//     match = splitText[0].match(wsRE);
//     if (match) return match[0].length;
//     else return 0;
//   }

//   else {
//     // let reducedSplitText: string[] = [];
//     // let match;

//     // get the first nonEmpty line, so don't set minimum to 0 because the line = ''
//     const firstNonEmptyLine = splitText.find(line => line.length);
//     if (firstNonEmptyLine) match = firstNonEmptyLine.match(wsRE);
//     else return 0;  // there are only empty lines

//     if (match) minimum = match[0].length;
//     else return 0;      // no whiteSpace at beginning of first nonEmpty line, so stop and return
//                                 // since won't be able to remove any leading whiteSpace

//     splitText.forEach(line => {
//       let lineLength: number;

//       if (line.length) {    // so empty lines are not considered
//         const thisLineMatch = line.match(wsRE);
//         if (thisLineMatch) {
//           lineLength = thisLineMatch[0].length;
//           if (lineLength < minimum) {
//             minimum = lineLength;
//           }
//         }
//       }
//     });

//     // const re = new RegExp(`(^\\s{${minimum}})`, "m");
//     // remove minimum amout of whiteSpace from each line
//     // reducedSplitText = splitText.map(line => line.replace(re, ''));

//     return minimum;
//   }
// }


/**
 * Get the length of the longest selected line
 * @param splitText 
 * @returns 
 */
async function _getMaximumLineLength(editor: TextEditor, selection: Selection): Promise<number> {
  
  let splitText;
  let selectedText = editor.document.getText(selection);
  
  if (selection.isSingleLine) {
    splitText = selectedText.trimEnd();
    return splitText.length;
  }
  else splitText = selectedText.split('\n');
  
  let maximum: number;

  // if only empty lines, return 0 as the maximum
  const firstNonEmptyLine = splitText.find(line => line.length);
  if (!firstNonEmptyLine) return 0;

  maximum = splitText[0].trimEnd().length;
  
  splitText.forEach(line => {
    let lineTrimmedLength = line.trimEnd().length;

    if (lineTrimmedLength > maximum) {
      maximum = lineTrimmedLength;
    }
  });

  return maximum;    
}


/**
 * Find and remove any common leading whitespace from all members of the splitText (from selectedText or CLIPBOARD)
 *
 * @param splitText
 * @returns with common leading whitespace removed
 **/
function _removeCommonLeadingWhiteSpace(splitText: string[]): string[] {

  // ignore empty lines (no white space) in the splitText

  if (splitText.length === 1) {
    splitText[0] = splitText[0].trim();
    return splitText;
  }

  else {
    let reducedSplitText: string[] = [];
    const wsRE = new RegExp("^(\\s*)", "m");  // whiteSpace regex
    let minimum: number;
    let match;

    // get the first nonEmpty line, so don't set minimum to 0 because the line = ''
    const firstNonEmptyLine = splitText.find(line => line.length);
    if (firstNonEmptyLine) match = firstNonEmptyLine.match(wsRE);
    else return splitText;  // there are only empty lines

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
    // remove minimum amout of whiteSpace from each line
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
 * @param options
 * @param selectionLength - selection or clipboard length
 * @param insertAt
 * @returns void
 **/
function _expandOptions(options: CommentBlockSettings, selectionLength: number, insertAt: number ): void {

  for  (const option of Object.entries(options)) {

    let elementsToInsert;

    if (option[0] === 'subjects' || option[0] === 'selectCurrentLine' || option[0] === 'keepIndentaion') continue;

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
 * @param options
 * @param numberOfLines
 * @returns void
 **/
async function _setLengthAndFill(options: CommentBlockSettings, numberOfLines: number): Promise<void> {

  const maxLength: number = Math.floor(numberOfLines);

  for (let [option, value] of Object.entries(options)) {

    if (option === 'selectCurrentLine' || option === 'keepIndentation') continue;

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
 * @param options
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