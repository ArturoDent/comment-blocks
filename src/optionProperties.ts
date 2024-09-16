/**
 * Input Box prompt for each option (like startText)
 *
 * @export
 * @param caller - the option asking for the input
 * @returns
 **/
export function getPrompts(caller: string): string {

  let prompts = {
    lineLength: "Enter an integer for 'lineLength'",
    startText: "Enter text for 'srartText'",
    endText: "Enter text for 'endText'",
    justify: "Enter text for 'justify'. Options: left, center or right",
    gapLeft: "Enter an integer for 'gapLeft'.  Integer >= 0",
    gapRight: "Enter an integer for 'gapRight'.  Integer >= 0",
    padLines: "Enter text for 'padLines'.  One character only",
    subjects: "Enter text for 'subjects'"
  };

  return prompts[caller as keyof typeof prompts];
}


/**
 * Input Box placeholder for each option (like startText)
 *
 * @export
 * @param caller - the option asking for the input
 * @returns
 **/
export function getPlaceHolders(caller: string): string {

  let placeHolders = {
    lineLength: "Example: 80",
    startText: "Example: //",
    endText: "Example: ''",
    justify: "Example: left",
    gapLeft: "Example: 5",
    gapRight: "Example: 0",
    padLines: "Examples: - or * or #",
    subjects: "Example: ${selectedText}"
  };

  return placeHolders[caller as keyof typeof placeHolders];
}