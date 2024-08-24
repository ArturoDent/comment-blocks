import * as vscode from 'vscode';
import * as languageConfigs from './getLanguageConfig';


/**
 * Trigger a QuickInput to get endText/startText/subjects from the user.
 * @param {string} caller  - which option (e.g., "subjects", "gapLeft") is being resolved
 * @param {number} line  - which line of the block comment
 * @returns {Promise<string>}
 */
export async function getInput (caller: string, line: number) {
  
  const title = caller;
  // let prompt = "";
  let placeHolder = `Enter text, number or array for the ${caller} option of line ${line}.`;
  
  const options = { title, placeHolder };
  // TODO: deal with arrays in the input
  return await vscode.window.showInputBox(options);
};


/**
 * Get the language configuration comments object for  the current file
 * @returns {Promise<object|undefined>} comments object
 */
export async function getlanguageConfigComments (toResolve: string) {
  
  const document = vscode.window.activeTextEditor?.document;
  if (!document) return undefined;
   
  // do only if $LINE_COMMENT, $BLOCK_COMMENT_START, $BLOCK_COMMENT_END in toResolve
  let re = /\$\{LINE_COMMENT\}|\$\{BLOCK_COMMENT_START\}|\$\{BLOCK_COMMENT_END\}/;
  if (toResolve.search(re) !== -1) {
    const documentLanguageId = document.languageId;
    return await languageConfigs.get(documentLanguageId, 'comments');
  }
	else return undefined;
};


/**
 * Convert string to PascalCase.  
 * first_second_third => FirstSecondThird
 * first-second-third => FirstSecondThird
 * firstSecondThird => FirstSecondThird
 * 
 * NOT from {@link https://github.com/microsoft/vscode/blob/273e4b0d7bd19bf8b9383d8de2e6fd01a3883852/src/vs/editor/contrib/snippet/browser/snippetParser.ts#L399}  
 * 
 * @param {string} value - string to transform to PascalCase  
 * @returns {string} transformed value  
 */
export function toPascalCase (value: string) {
  
  // the code form vacode GH does not work for 'howManyCows' ??
  // const match = value.match(/[a-z0-9]+/gi);  
	// if (!match) {
	// 	return value;
	// }
	// return match.map(word => {
	// 	return word[0].toLocaleUpperCase() + word.substring(1).toLocaleLowerCase();
	// })
  // 	.join('');
  
  value = value.trim();  // whitespaces are removed
  // split on uppercase letter that is followed by a lowercase letter or a '-' or an '_'
  const words = value.split(/(?=[A-Z])|[-_]/);
  const capitalizedWords = words.map(word => word.charAt(0).toUpperCase() + word.slice(1));
  return capitalizedWords.join('');
};


/**
 * Convert string to camelCase.  
 * first_second_third => firstSecondThird  
 * from {@link https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts}  
 * 
 * @param {string} value - string to transform to camelCase
 * @returns {string} transformed value  
 */
export function toCamelCase (value: string): string {
  
  value = value.trim();

	const match = value.match(/[a-z0-9]+/gi);
	if (!match) {
		return value;
	}
	return match.map((word, index) => {
		if (index === 0) {
			return word.toLocaleLowerCase();
		} else {
			return word[0].toLocaleUpperCase() + word.substring(1).toLocaleLowerCase();
		}
	})
		.join('');
};


// from https://stackoverflow.com/questions/33631041/javascript-async-await-in-replace

/**
 * An async version of replaceAll.  Called in resolveVariables.resolveVariables().
 * 
 * @param {string} toResolve - string to resolve
 * @param {RegExp} regexp
 * @param {Function} replacerFunction
 * 
 * @returns {Promise<string>}
 */
export async function replaceAsync (toResolve: string, regexp: RegExp, replacerFunction: Function) {
  
  if (!toResolve) return;
  
  const replacements = await Promise.all(
      Array.from(toResolve.matchAll(regexp),
          async match => await replacerFunction(...match)  // no difference
        // match => replacerFunction(...match)
    )
  );
  let i = 0;

  return toResolve.replace(regexp, () => replacements[i++]) || toResolve;
};



/**
 * An async version of replaceAll.  Called in resolveVariables.resolveVariables() and search.js.
 * Specifically for extension-derived variable resolution, notably ${getInput}
 * 
 * @param {string} toResolve - string to resolve
 * @param {RegExp} regex
 * @param {Function} asyncFn - the async replacer function
 * 
 * @returns {Promise<string>}
 */
export async function replaceAsync2 (toResolve: string, regex: RegExp, asyncFn: Function, selection: vscode.Selection, matchIndex: number, caller: string, line: number) {
 
  const matches = toResolve.match(regex);
 
  if (matches) {
    //  const replacement = await resolve.resolveExtensionDefinedVariables(matches[0], args, caller);
    // const replacement = await asyncFn(matches[0], selection, matchIndex, caller);
    const replacement = await asyncFn(matches[0], caller, line);
    toResolve = toResolve.replace(matches[0], replacement);
    // toResolve = await this.replaceAsync2(toResolve, regex, asyncFn, args, caller);
    toResolve = await replaceAsync2(toResolve, regex, asyncFn, selection, matchIndex, caller, line);
  }
 
  return toResolve;
};