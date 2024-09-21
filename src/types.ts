


export type LanguageComments = {
  lineComment?: string,
  blockComment?: string[]
};

export type CommentBlockSettings = {
  selectCurrentLine?: boolean,
  keepIndentation: boolean,
  lineLength: number | Array<number>,
  startText: string | Array<string>,
  endText: string | Array<string>,
  justify: string | Array<string>,
  gapLeft: number | Array<number>,
  gapRight: number | Array<number>,
  padLines: string | Array<string>,
  subjects: Array<string>
};