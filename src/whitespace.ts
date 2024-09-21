// import * as vscode from 'vscode';


/**
 * Find the length of any common leading whitespace from all members of the splitText (from selectedText or CLIPBOARD)
 *
 * @param splitText
 * @returns length of common leading whitespace
 **/
export function getCommonLeadingWhiteSpace(text: string[] | string): number {

  let minimum: number;
  const wsRE = new RegExp("^(\\s*)", "m");  // whiteSpace regex
  let match;

  // ignore empty lines (no white space) in the splitText

  if (typeof text === 'string') {
    match = text.match(wsRE);
    if (match) return match[0].length;
    else return 0;
  }

  else {
    // get the first nonEmpty line, so don't set minimum to 0 because the line = ''
    const firstNonEmptyLine = text.find(line => line.length);
    if (firstNonEmptyLine) match = firstNonEmptyLine.match(wsRE);
    else return 0;  // there are only empty lines

    if (match) minimum = match[0].length;
    else return 0;      // no whiteSpace at beginning of first nonEmpty line, so stop and return
                                // since won't be able to remove any leading whiteSpace

    text.forEach(line => {
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

    return minimum;
  }
}