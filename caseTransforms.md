# Examples of case transforms

These case transorms, like `\\S`, can be used for the string options: `subjects`, `startText` and `endText`.  

The code for these case transforms is from [VS Code github repo: lineOperations](https://github.com/microsoft/vscode/blob/main/src/vs/editor/contrib/linesOperations/browser/linesOperations.ts) to maintain consistency.  

With one exception, if the text to be transformed starts with an underscore (`_`) it is kept (as in the `_equalizeSubjectLengths`  example below).  This is because a function like `_myFunction` (using the local, non-exported convention of starting a function with an underscore) shouldn't be transformed to `my-function`, `MY_FUNCTION`, etc.  

Example usage:  

```jsonc
"subjects": [
  "Titlecase   =    \\T${nextFunction}",

  "camelCase   =    \\C${nextFunction}", 

  "PascalCase  =    \\P${nextFunction}",

  "SNAKE_CASE  =    \\S${nextFunction}",  // capital S for screaming snake case
  "snake_case  =    \\s${nextFunction}",  // small s for snake case 

  "KEBAB-CASE  =    \\K${nextFunction}",  // capital K for screaming kebab case
  "kebab-case  =    \\k${nextFunction}"   // small k for kebab case
]

```

Below the function name is "_equalizeSubjectLengths".  

```plainText
    _equalizeSubjectLengths =>

\\T      Titlecase   =    _Equalizesubjectlengths
\\C      camelCase   =    _equalizeSubjectLengths
\\P      PascalCase  =    _EqualizeSubjectLengths

\\S      SNAKE_CASE  =    _EQUALIZE_SUBJECT_LENGTHS
\\s      snake_case  =    _equalize_subject_lengths

\\K      KEBAB-CASE  =    _EQUALIZE-SUBJECT-LENGTHS
\\k      kebab-case  =    _equalize-subject-lengths
```

Below the function name is "equalizeSubjectLengths".  

```plainText
   equalizeSubjectLengths =>

\\T      Titlecase   =    Equalizesubjectlengths
\\C      camelCase   =    equalizeSubjectLengths
\\P      PascalCase  =    EqualizeSubjectLengths

\\S      SNAKE_CASE  =    EQUALIZE_SUBJECT_LENGTHS
\\s      snake_case  =    equalize_subject_lengths

\\K      KEBAB-CASE  =    EQUALIZE-SUBJECT-LENGTHS
\\k      kebab-case  =    equalize-subject-lengths
```

Below the function name is "equalize_Subject_Lengths".  

```plainText
   equalize_Subject_Lengths =>

\\T      TitleCase   =    Equalize_Subject_Lengths
\\C      camelCase   =    equalizeSubjectLengths
\\P      PascalCase  =    EqualizeSubjectLengths

\\S      SNAKE_CASE  =    EQUALIZE_SUBJECT_LENGTHS
\\s      snake_case  =    equalize_subject_lengths

\\K      KEBAB-CASE  =    EQUALIZE-SUBJECT-LENGTHS
\\k      kebab-case  =    equalize-subject-lengths
```

```plaintext
"startText": "\\S${relativeFile}"  =  MY_FILE_NAME   (screaming snake case)

"endText": "\\K${relativeFile}"    =  MY-FILE-NAME   (screaming kebab case)
```
