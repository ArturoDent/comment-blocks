import * as variables from './variables';


let vars = variables.getPathVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const pathGlobalRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<path>${ vars })`, 'g');

// in export resolveSearchPathVariables
// let vars = variables.getPathVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const pathNotGlobalRE = `(?<pathCaseModifier>\\\\[UuLl])?(?<path>${ vars })`;

vars = variables.getSnippetVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const snippetRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<snippetVars>${ vars })`, 'g');

vars = variables.getExtensionDefinedVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const extensionGlobalRE = new RegExp(`(?<caseModifier>\\\\[UuLl])?(?<extensionVars>${ vars })`, 'g');
export const extensionNotGlobalRE = new RegExp(`(?<caseModifier>\\\\[UuLl])?(?<extensionVars>${ vars })`);

export const capGroupCaseModifierRE = new RegExp("(?<caseModifier>\\\\[UuLl])(?<capGroup>\\$\\{?\\d(?!:)\\}?)", "g");
export const capGroupOnlyRE = new RegExp("(?<capGroupOnly>(?<!\\$)\\$\{(\\d)\\}|(?<!\\$)\\$(\\d))", "g");

export const caseTransformRE = new RegExp("(?<caseModifier>\\\\[UuLl])?(?<caseTransform>\\$\\{(\\d):\\/((up|down|pascal|camel|snake)case|capitalize)\\})", "g");

export const conditionalRE = new RegExp("(?<caseModifier>\\\\[UuLl])?(?<conditional>(\\$\\{(\\d):([-+?]?)(.*?\\\\\}.*?|.*?))\\})", "g");

// there is no jsOp in runInSearchPanel
// below is not working in resolveVaraibles for some reason
// export jsOpRE = new RegExp("(?<jsOp>\\$\\$\\{([\\S\\s]*?)\\}\\$\\$)", "gm");
  //  export jsOpRE = new RegExp("(?<jsOp>\\$\\$\\{([\\S\\s]*?)\\}\\$\\$)", "g");

//  lineNumber/lineIndex
export const lineNumberIndexRE = new RegExp("\\$\\{line(Number|Index)\\}");

// all in resolveVaraibles.js
export const pathCaseModifierRE = new RegExp("(?<caseModifier>\\\\[UuLl])?(?<vars>\\$\{\\s*.*?\\s*\\})");

// escape .*{}[]?^$+()| if using in a find or findSearch
export const escapeRegExCharacters = new RegExp("([\\.\\*\\?\\{\\}\\[\\]\\^\\$\\+\\|\\(\\)])", "g");
// 6 matches in resolveVariables.js

