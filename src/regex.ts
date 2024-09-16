import { getPathVariables, getSpecialVariables, getSnippetVariables, getExtensionDefinedVariables } from './variables';


const caseModifier = "(?<caseModifier>\\\\[UuLlTSsPCKk])?";
const escapeVarsRE = new RegExp(/([\$][\{])([^\}]+)(})/g); // $ => \\$, { => \\{, } = \\}
const replaceWithEscaped = "\\$1\\s*$2\\s*$3";

let vars = getPathVariables().join("|").replaceAll(escapeVarsRE, replaceWithEscaped);
export const pathGlobalRE = new RegExp(`${caseModifier}(?<path>${vars})`, 'g');

vars = getSpecialVariables().join("|").replaceAll(escapeVarsRE, replaceWithEscaped);
export const specialVariablesRE = new RegExp(`${caseModifier}(?<specialVars>${vars})`, 'g');

vars = getSnippetVariables().join("|").replaceAll(escapeVarsRE, replaceWithEscaped);
export const snippetRE = new RegExp(`${caseModifier}(?<snippetVars>${ vars })`, 'g');

vars = getExtensionDefinedVariables().join("|").replaceAll(escapeVarsRE, replaceWithEscaped);
export const extensionGlobalRE = new RegExp(`${caseModifier}(?<extensionVars>${ vars })`, 'g');
export const extensionNotGlobalRE = new RegExp(`${caseModifier}(?<extensionVars>${ vars })`);

// all in resolveVariables.js
export const caseModifierRE = new RegExp(`${caseModifier}(?<vars>\\$\{\\s*.*?\\s*\\})`);