# Comment Blocks

Create comment blocks like

```jsonc
// in keybindings.json

```

would result in:

```javascript
// in your file
```

---------------------------

```jsonc
// in keybindings.json

{
  "key": "alt+b",                               // whatever keybinding you want
  "command": "comment-blocks.createBlock",
  "args": {
    
    "justify": "left",
    "lineLength": [80,80,3],                    // line 3 is only 3 characters long
    "gapLeft": [0,10,0],                        // left gap only on second line
    "gapRight": 0,
    
    "startText": [
      "${BLOCK_COMMENT_START}",
      " * ",                                    // middle line starts with a ' *'
      ""
    ],
    
    "endText": ["", "", "${BLOCK_COMMENT_END}"],  // endText only on last line

    "subjects": [
      "",
      "${relativeFile} : ${nextFunction}",    // resolve the file and then ask the user for input
      ""
    ],

    "padLines": ""                            // don't pad any of the lines
  }
  // "when": "editorTextFocus && !editorReadonly && editorLangId == typescript"   // to restrict to a given language
}
```

would result in:

```javascript
// in your test2.js file

/*
 *            test2.js : funcCC
 */
function funcCC() {
  howdy();
}
```

## Features

There are many options and variables that can be used in creating these blocks.

## Options

|  Option           |  Type                | Default                       |                                         |
|-------------------|----------------------|-------------------------------|-----------------------------------------|
| selectCurrentLine | boolean              | `true`                        | Should the current line be selected     |
| lineLength        | integer or integer[] | 80                            | Each line can be a different length     |
| startText         | string or string[]   | `"${BLOCK_COMMENT_START}"`    | Text at the beginning of each line      |
| endText           | string or string[]   | `"${BLOCK_COMMENT_END}"`      | Text at the end of each line            |
| justify           | string or string[]   | `"center"`                    | Where to put the subjects on each line  |
| gapLeft           | integer or integer[] | 3                             | Blank space to the left of the subject  |
| gapRight          | integer or integer[] | 3                             | Blank space to the right of the subject |
| padLines          | string or string[]   | `"-"`  of length 1            | Character to be used to pad each line   |
| numberOfLines     | integer              | 3                             | How many lines is the comment block     |
| subjects          | string[]             | `["", "${selectedText}", ""]` | The subject for each line               |

These options all have default values as indicated above.  But those defaults can be modified in two different ways:

1. Modify the defaults in the setting.
2. Eack keybinding can set these options which will have precedence over the defaults.

The setting is `Comment Blocks: Defaults`.  This can be found in the Settings UI but that will direct you to `settings.json` for the actual editing:

```jsonc
// in settings.json

"commentBlocks.defaults": {  
  "selectCurrentLine": false,     // you should get intellisense for all options
  "justify": "left",
  "endText": "*${LINE_COMMENT}",
},
```

Whatever defaults you set in this setting can be overridden by a keybinding that runs the `comment-blocks.createBlock` command.

### Keybindings

```jsonc
// in keybindings.json

{
  "key": "alt+b",                              // whatever keybinding you want
  "command": "comment-blocks.createBlock",
  "args": {
    "justify": ["left", "center", "right"],    // each line is justified differently
    // "lineLength": 80,                       // if omitted, the default will be used
    "gapLeft": 5,                              // will be ignored if subject is ''
    "gapRight": 5,                             // will be ignored if subject is ''
    
                                               // setting Editor > Comments: Insert Space   is ignored
    "startText": "${LINE_COMMENT}",            // no space added after comment characters
    "endText": "${LINE_COMMENT}",
    
    // "endText": "",                          // so nothing is added at end!!  // works

    "padLines": ["-",  " ", "-"],              // pad middle line with spaces
    // "numberOfLines": 3,                     // the default, so unnecessary
    
    "subjects": [
      "\\U${previousFunction}",                // \\U = uppercase the previous function name
      "\\L${selectedText}",                    // \\L = lowercase the selected text
      "\\u${nextFunction}"                     // \\u capitalize first letter next function name
    ]
  }
  // "when": "editorTextFocus && !editorReadonly && editorLangId == typescript"   // to restrict to a given language
}
```

which would result in

```javascript
//     FUNCBB     ------------------------------------------------------------//
//                                    here1                                   //
//------------------------------------------------------------     FuncCC     //
```

String options like `startText`, `endText`, `padLines` and `subjects` can be a simple string or an array of strings if you want each line to have something different.

```jsonc
"startText": ["${LINE_COMMENT}-some text", "${LINE_COMMENT}-other text", "${LINE_COMMENT}-final text"]
```

You can make an option like `"startText": "${LINE_COMMENT}"` or `"startText": ["${LINE_COMMENT}"]` - they are the same.  In all cases, if the array length is greater than 1, the options will have their values extended so both of the above become `"startText": ["${LINE_COMMENT}", "${LINE_COMMENT}", "${LINE_COMMENT}"]`.  This automatically happens, you don't need to do it.  

Let's say the `numberOfLines` is 3 and you have an option like `"justify": ["left", "center"]`.  The last array entry will be repeated, so it becomes `"justify": ["left", "center", "center"]`.  This is what allows `"justify": "center"` or `"justify": ["center"]` to work to center **all** the lines.

Any of the variables listed below can be used, including combinations of them.  A typical `subject` option would be:

```jsonc
`["", "${selectedText}", ""]`    // no subject on first or third line, the selection on the middle line.
```

`\\U`, `\\u`, `\\L` and `\\l` can be used in front of a variable to change its casing.  Example: `\\U${selectedText}`.

## Variables

|                            |  Snippet variable equivalent  |  |
|----------------------------|-------------------------------|--|
| ${selectedText}            | ${TM_SELECTED_TEXT}           |  |
|                            | ${CLIPBOARD}                  |  |
|                            |                               |  |
| ${file}                    | ${TM_FILEPATH}                |  |
| ${relativeFile}            | ${RELATIVE_FILEPATH}          |  |
| ${fileBasename}            | ${TM_FILENAME}                |  |
| ${fileBasenameNoExtension} | ${TM_FILENAME_BASE}           |  |
| ${fileExtname}             |                               |  |
| ${fileDirname}             | ${TM_DIRECTORY}               |  |
| ${fileWorkspaceFolder}     |                               |  |
| ${workspaceFolder}         |                               |  |
|                            | ${WORKSPACE_FOLDER}           |  |
| ${relativeFileDirname}     |                               |  |
| ${workspaceFolderBasename} |                               |  |
| ${pathSeparator} or ${\/}  |                               |  |
| ${matchIndex}              | ${CURSOR_INDEX}               |  |
| ${matchNumber}             | ${CURSOR_NUMBER}              |  |
| ${lineIndex}               | ${TM_LINE_INDEX}              |  |
| ${lineNumber}              | ${TM_LINE_NUMBER}             |  |

|  Snippet variable           |  |
|-----------------------------|--|
| ${BLOCK_COMMENT_START}      | These will be resolved based on the current language |
| ${BLOCK_COMMENT_END}        |  |
| ${LINE_COMMENT}             |  |
|                             |  |
| ${TM_CURRENT_LINE}          |  |
| ${TM_CURRENT_WORD}          |  |
| ${CURRENT_YEAR}             |  |
| ${CURRENT_YEAR_SHORT}       |  |
| ${CURRENT_MONTH}            |  |
| ${CURRENT_MONTH_NAME}       |  |
| ${CURRENT_MONTH_NAME_SHORT} |  |
| ${CURRENT_DATE}             |  |
| ${CURRENT_DAY_NAME}         |  |
| ${CURRENT_DAY_NAME_SHORT}   |  |
| ${CURRENT_HOUR}             |  |
| ${CURRENT_MINUTE}           |  |
| ${CURRENT_SECOND}           |  |
| ${CURRENT_SECONDS_UNIX}     |  |
| ${CURRENT_TIMEZONE_OFFSET}  |  |
| ${RANDOM}                   |  |
| ${RANDOM_HEX}               |  |

|  Extension variables |  |
|----------------------|--|
| ${getInput}          | Opens an input box to get the content, can be used multiple times            |
| ${getTextLine:n}     | Get the text at line n, which is 0-based                                     |
|                      |                                                                              |
| ${previousFunction}  | The previous function name - above the cursor                                |
| ${nextFunction}      | The next function name - after the cursor                                    |
| ${parentFunction}    | The function name of the parent function                                     |
| ${thisFunction}      | The function name of an included function (within a parent function)         |
|                      |  |
| ${nextSymbol}        | Next symbol name, may be a variable, function, etc. name                     |
| ${previousSymbol}    | Previous symbol name.  These functiona nd symbol names are lanuage-dependent |

You can use launch/task-type variables and snippet variables.  Many of these produce the same output but may have different names.  It doesn't matter which you use.

One reason why you might want to occaisonally use the snippet form of a variable is to make it into a transform, for example:

```jsonc
// part of a comment-blocks.createBlock keybinding in your keybindings.json

"subjects": [
  "",
  "${TM_SELECTED_TEXT/.*-(.*)/$1/}",  // transform the selected text, would NOT work with ${selectedText}
  ""
]
```

this would get and keep only that part of the selected text after a `-`.  You can do any snippet transform like this that you could in a regular snippet.  Just be aware that the actual transform is done by vscode upon insertion of the text, thus this extension cannot account for its result or length and you would have to adjust for the padding yourself afterwards.

### `${getInput}`

You can use this "variable" on any of the text (`string` or `string[]`) options as often as you like.  This would open 3 input boxes in a row asking for the input for that option:

```jsonc
// part of a comment-blocks.createBlock keybinding in your keybindings.json

"startText": [
  "${BLOCK_COMMENT_START}",
  " * ${getInput}",
  "${BLOCK_COMMENT_END}"
],

"endText": "${getInput}",  // ask for the lineLength once, it will be used for all lines

"subjects": [
  "",
  "${file} : ${getInput}",    // resolve the file and then ask the user for input
  ""
]
```

## Known Issues

## Release Notes
