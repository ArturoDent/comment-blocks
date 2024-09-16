import { LanguageComments } from './types';


// global so this can be looked up in extension.ts and updated in resolveVariables()
declare global {
  var comments: LanguageComments | undefined;
  var previousLanguage: string;
}

export { };