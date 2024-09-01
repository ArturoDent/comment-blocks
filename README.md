# Comment Blocks

Create comment blocks like

```javascript
/*
 *     test2.js : funcCC
 *     Modification Date: 2024:08:24  20:08
*/
```

---------------------------

```javascript
////////////////////////////////////////////////////////////////////////////////
//                             some_function_next                             //
////////////////////////////////////////////////////////////////////////////////
```

---------------------

```javascript
/*
 *            test2.js : funcCC
 */
function funcCC() {
  howdy();
}
```

--------------------

```javascript
////////////////////////////////////////////////////////////
//////////////////////// First Line ////////////////////////
///////////////////////  Second Line ///////////////////////
//////////////////////// Third Line ////////////////////////
////////////////////////////////////////////////////////////
```

These four examples are explained below.

## Features

There are many options and variables that can be used in creating these blocks.

### Options

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
|                   |                      |                               |                                         |
| subjects          | string[]             | `["", "${selectedText}", ""]` | The subject for each line               |

* The number of lines of the comment block is determined by how many `subjects` you have.

```jsonc
"subjects": "${selectedText}"                     // comment block is 1 line
"subjects": ["${selectedText}"]                   // comment block is 1 line

"subjects": ["", "${selectedText}", ""}           // // comment block is 3 lines
"subjects": ["${file}", "", "${selectedText}", "", "${nextFunction}"}  // 5 lines

// a subject of "" (with no space) creates a spacer line with no subject

```

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
    
    "subjects": [                              // this comment block will be 3 lines
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

Let's say the number of `subjects` you have is 3 and you have an option like `"justify": ["left", "center"]`.  The last array entry will be repeated, so it becomes `"justify": ["left", "center", "center"]`.  This is what allows `"justify": "center"` or `"justify": ["center"]` to work to center **all** the lines.

Any of the variables listed below can be used, including combinations of them.  A typical `subject` option would be:

```jsonc
`["", "${selectedText}", ""]`    // no subject on first or third line, the selection on the middle line.
```

`\\U`, `\\u`, `\\L` and `\\l` can be used in front of a variable to change its casing.  Example: `\\U${selectedText}`.

### Variables

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

#### `${getInput}`

You can use this "variable" on any of the options as often as you like.  The below would open 3 input boxes in a row asking for the input for that option:

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

#### `${selectedText}` and `${CLIPBOARD}`

Both of these variables can consist of either a single line or word or they could contain multiple lines.  These must be special handling of multiline content.  If you have a keybinding like

```jsonc
{
  "key": "alt+b",                        // whatever keybinding you want
  "command": "comment-blocks.createBlock",
  "args": {
    
                             // 5 items, which matches the "subjects" length
    "justify": ["center", "center", "left", "center", "center"],
    
    "gapLeft": 5,
    "gapRight": 5,
    
    "subjects": [
      "${relativeFile}",
      "",
      "${selectedText}",    // or "${CLIPBOARD}"  // note this is the third item
      "",
      "${previousFunction}"
    ],
    "padLines": [" "]
  }
}
```

you could produce this (where the code was selected)

```javascript
/*                                  test2.js                                  */
/*                                                                            */
/*     let a = 12;                                                            */
/*     let b = [0, 1, 3, 4];                                                  */
/*                                                                            */
/*     function funcCC() {                                                    */
/*       howdy();                                                             */
/*     }                                                                      */
/*                                                                            */
/*                                   funcBB                                   */
```

* IMPORTANT: `${selectedText}` was the third item in `subjects`.  Its entire content was left-justified because the **third** `justify` value was `"left"`.

* Each line of the selected text is put on its own line but all of it is left-justified.  In this case, any option, like `justify` or `padLines` that you want to be applied to the `${selectedText}` should be in the same array postition.  So if you wanted a different padding character for the selected text lines, you could use something like this:

```jsonc
"padLines": [" ", " ", "-"]
```

Note that `"-"` is in the third position.  Also note that since there are more `subjects` lines, in this case they would also get the last designated padding value `"-"`.  If you wanted the following lines to all have other padding, use `"padLines": [" ", " ", "-", " "]` for example.

The same is true for `${CLIPBOARD}` - put any specific option value in the same position or positions where `${CLIPBOARD}` appears in the `subjects`.  You can use multiples of these like:

```jsonc
{
  "key": "alt+b",                        // whatever keybinding you want
  "command": "comment-blocks.createBlock",
  "args": {
                             // 5 items, which matches the "subjects" length
    "justify": ["left", "center", "left"],
    
    "gapLeft": 5,
    "gapRight": 5,
    
    "subjects": [
      "${CLIPBOARD}",       // first item
      "${getInput}",
      "${selectedText}",    // the third item
      // more lines with "${CLIPBOARD}" or "${selectedText}"
    ],
    "padLines": [" "]
  }
}
```

Here the `${getInput}` content would be centered, and all the content of the clipboard and the current selection would be left-justified.

### More examples

```jsonc
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    "justify": "center",           // center is the default, so this is unnecessary
        
    "lineLength": 80,
    "padLines": ["/", " ", "/"],   // middle line is padded with spaces
    
    "startText": "${LINE_COMMENT}",    
    "endText": "${LINE_COMMENT}",  
      
    "subjects": [
      "", 
      "${nextFunction}", 
      ""
    ]
  }
}
```

produces

```javascript
////////////////////////////////////////////////////////////////////////////////
//                             some_function_next                             //
////////////////////////////////////////////////////////////////////////////////
```

-------------------

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    "justify": ["left"],
                              // This will NOT truncate the line content, only padding after the content 
    "lineLength": 0,          // !! Prevents padding after the content to the end of the line
    "gapLeft": [0, 5, 5, 0],
    "padLines": [" "],
    
    "startText": [
      "${BLOCK_COMMENT_START}",
      " *",
      " *",
      ""
    ],
    
    "endText": ["", "", "", " ${BLOCK_COMMENT_END}"],    
    "subjects": [
      "", 
      "${relativeFile} : ${nextFunction}", 
      "Modification Date: ${CURRENT_YEAR}:${CURRENT_MONTH}:${CURRENT_DATE}  ${CURRENT_HOUR}:${CURRENT_MINUTE}",
      ""
    ]
  }
},
```

produces

```javascript
/*
 *     test2.js : funcCC
 *     Modification Date: 2024:08:24  20:08
*/
```

* Using `"lineLength": 0` will be overridden by the actual content.  So if you **DO NOT** want padding after the content (like spaces up to column 80, for example) just a `lineLength` of `0` for those lines.

----------------

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

    "padLines": ""                            // this will be converted to "padLines": " " (a space)
  }
  // "when": "editorTextFocus && !editorReadonly && editorLangId == typescript"   // to restrict to a given language
}
```

produces

```javascript
/*
 *            test2.js : funcCC
 */
function funcCC() {
  howdy();
}
```

* As noted above `"padLines": ""` (with no space) will be converted to `"padLines": " "` (with a space), otherwise your chosen `lineLength` would have no meaning - you can't pad out to some `lineLenght` with nothing.  Likewise, if you had `"padLines": "${getInput}"` and you entered nothing into the input box, it would be converted to `"padLines": " "` (with a space).

---------------------

```jsonc
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    // "justify": "center",  // center is the default
    
    "lineLength": 60,
    "padLines": ["/", "/", "/"],
    "gapLeft": 1,
    "gapRight": 1,
    
    "startText": "${LINE_COMMENT}",    
    "endText": "${LINE_COMMENT}",  
      
    "subjects": [
      "", 
      "${selectedText}",   // or use ${getInput} to ask for text to wrap
      ""
    ]
  }
}
```

produces

```javascript
////////////////////////////////////////////////////////////
//////////////////////// First Line ////////////////////////
///////////////////////  Second Line ///////////////////////
//////////////////////// Third Line ////////////////////////
////////////////////////////////////////////////////////////
```

after selecting the below and triggering the keybinding

```plaintext
First Line
Second Line
Third Line
```

## Known Issues

Only the primary selection is used.  That is the first one you made, not necessarily the one nearer the top of the file.

Right-justifying will put the lines flush right, as expected.  But this loses the effect of leading spaces or tabs.  So you probably don't want to right-justify multiple lines of code with indentation.

## Release Notes
