import * as variables from './variables';

let vars = variables.getPathVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const pathGlobalRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<path>${vars})`, 'g');

vars = variables.getSpecialVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const specialVariablesRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<specialVars>${vars})`, 'g');

vars = variables.getSnippetVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const snippetRE = new RegExp(`(?<pathCaseModifier>\\\\[UuLl])?(?<snippetVars>${ vars })`, 'g');

vars = variables.getExtensionDefinedVariables().join("|").replaceAll(/([\$][\{])([^\}]+)(})/g, "\\$1\\s*$2\\s*$3");
export const extensionGlobalRE = new RegExp(`(?<caseModifier>\\\\[UuLl])?(?<extensionVars>${ vars })`, 'g');
export const extensionNotGlobalRE = new RegExp(`(?<caseModifier>\\\\[UuLl])?(?<extensionVars>${ vars })`);

// all in resolveVaraibles.js
export const pathCaseModifierRE = new RegExp("(?<caseModifier>\\\\[UuLl])?(?<vars>\\$\{\\s*.*?\\s*\\})");