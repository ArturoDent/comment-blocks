import { extensions } from 'vscode';
import { LanguageComments } from './types';


import { parse } from 'jsonc-parser';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';


/**
 * Get an array of "languages", like plaintext, that don't have comment syntax
 * @returns
 */
function _getLanguagesToSkip  (): string[] {
    return ['code-text-binary', 'bibtex', 'log', 'Log', 'search-result', 'plaintext', 'juliamarkdown', 'scminput', 'properties', 'csv', 'tsv', 'excel'];
}

/**
 * From the language configuration for the current file get the value of config argument
 * Usage: await languageConfigs.get(documentLanguageId, 'comments');
 *
 * @param langID - the languageID of the desired language configuration
 * @param config - the language configuration to get, e.g., 'comments.lineComment' or 'autoClosingPairs'
 *
 * @returns string or array or null if can't be found
 */
export async function get (langID: string, config: string): Promise<LanguageComments|undefined> {

  if (_getLanguagesToSkip().includes(langID)) return undefined;
  else if (langID.startsWith('csv')) return undefined;

	let configArg;

	if (config && config.includes('.')) configArg = config.split('.');
	else configArg = config;

	let desiredConfig = null;  // return null default if can't be found

	var langConfigFilePath = null;

	for await (const extension of extensions.all) {
		if (
			extension.packageJSON.contributes &&
			extension.packageJSON.contributes.languages
		) {
			// Find language data from "packageJSON.contributes.languages" for the langID argument
			// don't filter if you want them all
			const packageLangData = extension.packageJSON.contributes.languages.find(
				(_packageLangData: any) => (_packageLangData.id === langID)
			);
			// if found, get the absolute config file path
			if (!!packageLangData && packageLangData.configuration) {
				langConfigFilePath = join(
					extension.extensionPath,
					packageLangData.configuration
				);
				break;
			}
		}
	}

	if (!!langConfigFilePath && existsSync(langConfigFilePath)) {

		// the whole language config will be returned if config arg was the empty string ''
    desiredConfig = await parse(readFileSync(langConfigFilePath).toString());

		if (Array.isArray(configArg)) {

			for (let index = 0; index < configArg.length; index++) {
				desiredConfig = desiredConfig[configArg[index] ];
			}
			return desiredConfig;
		}
		else if (config) return await parse(readFileSync(langConfigFilePath).toString())[config];
		else return desiredConfig;
	}
	else return undefined;
};