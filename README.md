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

```javascript
//---------------------------     someFuncName     ---------------------------//
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
//////////////////////// First Line  ///////////////////////
//////////////////////// Second Line ///////////////////////
//////////////////////// Third Line  ///////////////////////
////////////////////////////////////////////////////////////
```

-----------------

```javascript
//----------------     relativeFile = test2.js                ----------------//
//----------------     workspaceFolderBasename = Test Bed     ----------------//
//----------------     fileBasenameNoExtension = test2        ----------------//
```

These examples are explained below.

-----------

## Options

There are many options and variables that can be used in creating these blocks.

<div style="border: 1px solid; width:fit-content;">

| Option            | Type               | Default                     |                                       |
|-------------------|--------------------|-----------------------------|---------------------------------------|
|`selectCurrentLine`|boolean             |`true`                       |Should the current line(s) be selected |
|`lineLength`       |integer or integer[]|80                           |Each line can be a different length    |
|`startText`        |string or string[]  |`${BLOCK_COMMENT_START}`     |Text at the beginning of each line     |
|`endText`          |string or string[]  |`${BLOCK_COMMENT_END}`       |Text at the end of each line *         |
|`justify`          |string or string[]  |`center`                     |Where to put the subjects on each line |
|`gapLeft`          |integer or integer[]|3                            |Blank space to the left of the subject |
|`gapRight`         |integer or integer[]|3                            |Blank space to the right of the subject|
|`padLines`         |string or string[]  |`-`  of length 1             |Character to be used to pad each line  |
|                   |                    |                             |                                       |
|`subjects`         |string or string[]  |`["", "${selectedText}", ""]`|The subject for each line              |
</div>
<br/>

* If you set the default for `startText` to `${LINE_COMMENT}` (in your settings) the default for `endText` will also be set to `${LINE_COMMENT}`.

* `selectCurrentLine` applies to the current line and all partially selected lines in a multiline selection.  The selection will be expanded to include all of the lines - so from character 0 on the first line of the selection to the end of the last selected line.

* **Important**: If you make a non-empty selection on a **single line** (so an actual selection, not just a cursor point), then that line's selection will **NOT** be expanded - ignoring the `selectCurrentLine` setting!  It is assumed that if you make a selection on one line, then that is all you want - not the rest of the line, especially any leading whitespace on the line.

* The number of lines of the comment block is determined by how many `subjects` you have, except when you use `${selectedText}` and `${CLIPBOARD}`.  The number of subject lines for `${selectedText}` and `${CLIPBOARD` are expanded by their length.  So if the selected text is 3 lines long, the number of subjects represented by `${selectedText}` is 3 lines in addition to any other subject lines you may have.

```jsonc
"subjects": "${relativeFile}"                     // comment block is 1 line
"subjects": "${relativeFile} - ${fileDirname}"    // comment block is 1 line

"subjects": ["${relativeFile}"]                   // comment block is 1 line

// assume for below that the selectedText or clipBoard text is 3 lines long

"subjects": "${selectedText}"                     // comment block is 3 lines
"subjects": ["${selectedText}"]                   // comment block is 3 lines

"subjects": "${CLIPBOARD}"                        // comment block is 3 lines

"subjects": ["", "${selectedText}", ""]           // comment block is 5 lines
"subjects": ["${file}", "", "${selectedText}", "", "${nextFunction}"]    // 7 lines

// a subject of "" (with no space) creates a spacer line with no subject
```

These options all have default values as indicated above.  But those defaults can be modified in two different ways:

1. Modify the defaults in the setting.
2. Each keybinding can set these options which will have precedence over the defaults.

## Setting

Go to the [Comment Blocks setting](vscode://settings/commentBlocks.defaults) in your Settings UI..

The setting is `Comment Blocks: Defaults`.  This can be found in the Settings UI but that will just direct you to `settings.json` for the actual editing:

```jsonc
// in settings.json

"commentBlocks.defaults": {  
  "selectCurrentLine": false,     // you should get intellisense for all options and available variables
  "justify": "left",
  "endText": "*${LINE_COMMENT}",
}
```

Whatever defaults you set in this setting can be overridden by a keybinding that runs the `comment-blocks.createBlock` command.

## Keybindings

```jsonc
// in keybindings.json

{
  "key": "alt+b",                              // whatever keybinding you want
  "command": "comment-blocks.createBlock",
  "args": {
    "justify": ["left", "center", "right"],    // each line is justified differently
    // "lineLength": 80,                       // if omitted, the default will be used
    "gapLeft": 5,                              // will be ignored if subject is '' empty
    "gapRight": 5,                             // will be ignored if subject is '' empty
    
                                               // the setting 'Editor > Comments: Insert Space' is ignored
    "startText": "${LINE_COMMENT}",            // so no space added after comment characters
    "endText": "${LINE_COMMENT}",
    
    // "endText": "",                          // use this so nothing is added at end!!

    "padLines": ["-",  " ", "-"],              // pad middle line with spaces
    
    "subjects": [                              // this comment block will be 'at least' 3 lines long
      "\\U${previousFunction}",                // \\U = uppercase the previous function name
      "\\L${selectedText}",                    // can't use case modifiers 'if' the selectedText includes variables
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

```javascript
//-some text  ////////////////////  TEST2.JS  //////////////////////////////////
//-other text  /////////////////////////////////////////////////////////////////
//-final text  //////////////  some selected text   ////////////////////////////
```

--------------------

```jsonc
"startText": ["${LINE_COMMENT} \\U${relativeFile}  "]

// TEST2.JS  ///////// etc.......
```

----------

You can make an option like `"startText": "${LINE_COMMENT}"` or `"startText": ["${LINE_COMMENT}"]` - they are the same.  

In all cases, if the number of subjects is greater than 1, the options will have their values extended so both of the above become `"startText": ["${LINE_COMMENT}", "${LINE_COMMENT}", "${LINE_COMMENT}"]`.  This automatically happens, you don't need to do it.  

Let's say the number of `subjects` you have is 3 and you have an option like `"justify": ["left", "center"]`.  The last array entry will be repeated, so it becomes `"justify": ["left", "center", "center"]`.  This is what allows `"justify": "center"` or `"justify": ["center"]` to work to center **all** the lines.

Any of the variables listed below can be used, including combinations of them.  A typical `subject` option would be:

```jsonc
`["", "${selectedText}", ""]`    // no subject on first or third line, the selection on the middle line.
```

`\\U`, `\\u`, `\\L` and `\\l` can be used in front of a variable to change its casing.  Example: `\\U${selectedText}`.

* This does not work: `\\U${CLIPBOARD}` or `\\U${selectedText}` **where** the clipBoard or the selected text contain another variable from below that you want resolved.  `${CLIPBOARD}` or `${selectedText}` by themselves will resolve included variables, you just can't change the casing of those with `\\U${CLIPBOARD}` or `\\U${selectedText}` (or the other casing modifiers like `\\L`, etc.).

If the clipBoard or the selected text contains `${relativeFile} ${fileBasename} ${fileBasenameNoExtension}` (for example) **all** those variables would be resolved within the `${CLIPBOARD}` and `${selectedText}` variables.

------------

You could make the settings contain most or all of your options and values.  Like this setting:

```jsonc
// in settings.json

 "commentBlocks.defaults": {
  
    // any option NOT listed here will be set to the default, listed above, like lineLength: 80

    "justify": ["right"],

    "gapLeft": 2,       // default is 3
    "gapRight": 2,

    "subjects": [
      "${selectedText}"
    ],

    "padLines": "*"
  }
```

and then a keybinding like:

```jsonc
// in keybindings.json

{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    "justify": "center"   // to override the default value of "right" above
    
    // anything else you wanted to change from the default
  }
}
```

There is a **precedence** to the options:

1. If the option is not set in (2) or (3), use the defaults as listed in the Options table above.
2. Override (1) in settings.json `"commentBlocks.defaults": {}`.
3. Override (1) and (2) in a keybinding.

------------------

## Variables

<div style="border: 1px solid; width:fit-content;">

|                                |  Snippet equivalent             |  |
|--------------------------------|---------------------------------|--|
| [Launch/task Variables reference](https://code.visualstudio.com/docs/editor/variables-reference#_predefined-variables) | [Snippet Variables reference](https://code.visualstudio.com/docs/editor/userdefinedsnippets#_variables) |  |
| `${selectedText}`              | `${TM_SELECTED_TEXT}`           |  |
|                                |                                 |  |
|                                | `${CLIPBOARD}`                  |  |
|                                |                                 |  |
| `${file}`                      | `${TM_FILEPATH}`                |  |
| `${relativeFile}`              | `${RELATIVE_FILEPATH}`          |  |
| `${fileBasename}`              | `${TM_FILENAME}`                |  |
| `${fileBasenameNoExtension}`   | `${TM_FILENAME_BASE}`           |  |
| `${fileExtname}`               |                                 |  |
| `${fileDirname}`               | `${TM_DIRECTORY}`               |  |
| `${fileWorkspaceFolder}`       |                                 |  |
| `${workspaceFolder}`           |                                 |  |
|                                | `${WORKSPACE_FOLDER}`           |  |
| `${relativeFileDirname}`       |                                 |  |
| `${workspaceFolderBasename}`   |                                 |  |
| `${pathSeparator}` or `${\/}`  |                                 |  |
| `${matchIndex}`                | `${CURSOR_INDEX}`               |  |
| `${matchNumber}`               | `${CURSOR_NUMBER}`              |  |
| `${lineIndex}`                 | `${TM_LINE_INDEX}`              |  |
| `${lineNumber}`                | `${TM_LINE_NUMBER}`             |  |
</div>
</br>

<div style="border: 1px solid; width:fit-content;">

|  Other Snippet variables      |  |
|-------------------------------|--|
| `${BLOCK_COMMENT_START}`      | Resolved based on the current language |
| `${BLOCK_COMMENT_END}`        | Resolved based on the current language |
| `${LINE_COMMENT}`             | Resolved based on the current language |
|                               |  |
| `${TM_CURRENT_LINE}`          |  |
| `${TM_CURRENT_WORD}`          |  |
| `${CURRENT_YEAR}`             |  |
| `${CURRENT_YEAR_SHORT}`       |  |
| `${CURRENT_MONTH}`            |  |
| `${CURRENT_MONTH_NAME}`       |  |
| `${CURRENT_MONTH_NAME_SHORT}` |  |
| `${CURRENT_DATE}`             |  |
| `${CURRENT_DAY_NAME}`         |  |
| `${CURRENT_DAY_NAME_SHORT}`   |  |
| `${CURRENT_HOUR}`             |  |
| `${CURRENT_MINUTE}`           |  |
| `${CURRENT_SECOND}`           |  |
| `${CURRENT_SECONDS_UNIX}`     |  |
| `${CURRENT_TIMEZONE_OFFSET}`  |  |
| `${RANDOM}`                   |  |
| `${RANDOM_HEX} `              |  |
</div>
</br>

<div style="border: 1px solid; width:fit-content;">

|  Extension variables   | These are defined by this extension only                               |
|------------------------|------------------------------------------------------------------------|
| `${getInput}`          | Opens an input box to get the content, can be used multiple times      |
|                        |                                                                        |
| `${previousFunction}`  | The previous function name - somewhere above the cursor                |
| `${nextFunction}`      | The next function name - somewhere after the cursor                    |
| `${parentFunction}`    | Function name of the parent (i.e., the outer) function                 |
| `${thisFunction}`      | function name of the current function, may be within an outer function |
|                        |                                                                        |
| `${nextSymbol}`        | Next symbol name, may be a variable, function, etc. name               |
| `${previousSymbol}`    | Previous symbol name.  Symbol names are language-dependent             |
</div>
</br>

You can use the above launch/task-type variables and snippet variables.  Many of these produce the same output but may have different names.  It doesn't matter which you use.

One reason why you might want to occaisonally use the snippet form of a variable is to make it into a transform, for example:

```jsonc
// part of a comment-blocks.createBlock keybinding in your keybindings.json

"subjects": [
  "",
  "${TM_SELECTED_TEXT/.*-(.*)/$1/}",  // transform the selected text, would NOT work with ${selectedText}
  ""
]
```

This would get and keep only that part of the selected text after a `-`.  You can do any snippet transform like this that you could in a regular snippet.  Just be aware that the actual transform is done by vscode upon insertion of the text, thus this extension cannot account for its length and you would have to adjust for the padding yourself afterwards.

### `${getInput}`

You can use this "variable" on any of the options as often as you like.  The below would open 3 input boxes in a row asking for the input for that option:

```jsonc
// in a keybinding or setting

"startText": [
  "${BLOCK_COMMENT_START}",
  " * ${getInput}",
  "${BLOCK_COMMENT_END}"
],

"endText": "${getInput}",  // ask for the endText once, it will be used for all lines

"subjects": [
  "",
  "${file} : ${getInput}",    // resolve the file and then ask the user for input
  ""
]
```

### `${selectedText}` and `${CLIPBOARD}`

Both of these variables can consist of either a single line or word or they could contain multiple lines.  There is special handling of multiline content.  If you have a keybinding like

```jsonc
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
                             // 5 items, which matches the "subjects" length
    "justify": ["center", "center", "left", "center", "center"],
    
    "gapLeft": 5,
    "gapRight": 5,
    
    "subjects": [
      "${relativeFile}",
      "",
      "${selectedText}",    // or "${CLIPBOARD}" // note this is the third subject item
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
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
                             // 3 items, which matches the "subjects" length
    "justify": ["left", "center", "left"],
    
    "gapLeft": 5,           // will be applied to all lines
    "gapRight": 5,          // will be applied to all lines
    
    "subjects": [
      "${CLIPBOARD}",       // first item : left-justified
      "${getInput}",        // second item : centered
      "${selectedText}"     // the third item : left-justified
    ],
    "padLines": [" "]       // will be applied to all lines
  }
}
```

Here the `${getInput}` content would be centered, and all the content of the clipboard and the current selection would be left-justified.

You can put other text, including variables, on the `"${CLIPBOARD}"` or `"${selectedText}"` subject lines, like

```jsonc
    "subjects": [

      "Hello ${CLIPBOARD}",       // "Hello" would be put at the beginning of the FIRST line of the clipBoard text
      "",
      "See ${nextFunction}: ${selectedText} for more"
    ]
```

* Unless they is only a single line of clipboard or selected text, don't put another `${CLIPBOARD}` or `${selectedText}` on a subject line with another already there - the results will probably not be what you expect (i.e., it is not supported).

Example: If the clipBoard  or the selected text contains `${relativeFile} ${fileBasename} ${fileBasenameNoExtension}` (if they were all on one line for example) **all** those variables would be resolved within a `${CLIPBOARD}` and `${selectedText}` variable.

## Explaining the Examples at the Top

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    // "justify": "center",           // center is the default, so this is unnecessary
        
    "padLines": ["/", " ", "/"],     // middle line is padded with spaces
    // if you pad with a space " ", gapLeft and gapRight become irrelevant for that line
    
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

----------

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    "justify": "right",
    
    "startText": "${LINE_COMMENT}",
    
    "subjects": "${nextFunction}",  // get the next function name
    
    // "subjects": "Function ${nextFunction} ()",  // can add any text before and after
    
    "gapLeft": 5,
    "gapRight": 5,
    "padLines": "-"
  }
}
```

produces

```javascript
//---------------------------     someFuncName     ---------------------------//

or

//------------------------------------------     Function someFuncName ()     */
```

-------------------

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    "justify": ["left"],
                              // "lineLength": 0  will NOT truncate the line content
    "lineLength": 0,          // !! Prevents padding after the content to the end of the line
    "gapLeft": [0, 5, 5, 0],
    "padLines": [" "],
    
    "startText": [
      "${BLOCK_COMMENT_START}",
      " *",
      " *",
      ""
    ],
    
    "endText": ["", "", "", " ${BLOCK_COMMENT_END}"],    // note space before ${BLOCK_COMMENT_END}
    "subjects": [
      "", 
      "${relativeFile} : ${nextFunction}", 
      "Modification Date: ${CURRENT_YEAR}:${CURRENT_MONTH}:${CURRENT_DATE}  ${CURRENT_HOUR}:${CURRENT_MINUTE}",
      ""                             // a subject of "" will be replaced with " "
    ]
  }
}
```

produces

```javascript
/*
 *     test2.js : funcCC
 *     Modification Date: 2024:08:24  20:08
 */
```

* Using `"lineLength": 0` will be overridden by the actual content.  So if you **DO NOT** want padding after the content (like spaces up to column 80, for example) use a `lineLength` of `0` for those lines.

----------------

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock",
  "args": {
    
    "justify": "left",
    "lineLength": [80,80,3],                    // line 3 is only 3 characters long
    "gapLeft": [0,10,0],                        // left gap only on second line
    "gapRight": 0,
    
    "startText": [
      "${BLOCK_COMMENT_START}",
      " * ",                                    // middle line starts with a ' * '
      ""
    ],
    
    "endText": ["", "", "${BLOCK_COMMENT_END}"],  // endText only on last line

    "subjects": [
      "",
      "${relativeFile} : ${nextFunction}",    // resolve the file and then get the next function  name
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

* As noted above `"padLines": ""` (with no space) will be converted to `"padLines": " "` (with a space), otherwise your chosen `lineLength` would have no meaning - you can't pad out to some `lineLenghth` with nothing.  Likewise, if you had `"padLines": "${getInput}"` and you entered nothing into the input box, it would be converted to `"padLines": " "` (with a space).

---------------------

```jsonc
// in keybindings.json
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
//////////////////////// First Line  ///////////////////////
//////////////////////// Second Line ///////////////////////
//////////////////////// Third Line  ///////////////////////
////////////////////////////////////////////////////////////
```

after selecting the below and triggering the keybinding

```plaintext
First Line
Second Line
Third Line
```

-------------------

This setting

```jsonc
// in settings.json
"commentBlocks.defaults": {
  "justify": "center",
  
  "startText": "${LINE_COMMENT}",
  // because startText is set to ${LINE_COMMENT}, endText will be set to ${LINE_COMMENT} too
  // thus overriding the default ${BLOCK_COMMENT_END}.  
  // "endText": "${LINE_COMMENT}",   // so this is not necessary if "startText": "${LINE_COMMENT}"
  
  "subjects": "${selectedText}",
  
  "gapLeft": 5,
  "gapRight": 5,
  "padLines": "-"
}
```

and this keybinding

```jsonc
// in keybindings.json
{
  "key": "alt+b",
  "command": "comment-blocks.createBlock"      // no args!
}
```

produces

```javascript
//----------------     relativeFile = test2.js                ----------------//
//----------------     workspaceFolderBasename = Test Bed     ----------------//
//----------------     fileBasenameNoExtension = test2        ----------------//
```

after selecting this text

```plaintext
relativeFile = ${relativeFile}
workspaceFolderBasename = ${workspaceFolderBasename}
fileBasenameNoExtension = ${fileBasenameNoExtension}
```

-------------

## Known Issues

Only the **primary** selection is used and **REPLACED**.  That is the first one you made, not necessarily the one nearer the top of the file.

`\\U${CLIPBOARD}` or `\\U${selectedText}` do not work (will not resolve) any variables included in the clipboard or selected text.  `${CLIPBOARD}` or `${selectedText}` (i.e., with no case modifiers) do resolve such included variables.

## TODO

* Check `defaults` for bad values?
* Improve undefined `subjects` handling.
* Enable case modifying of `${CLIPBOARD}` or `${selectedText}` with included variables.
* Support pascalCase, camelCase, and snakeCase.
* Handle content that exceeds the `lineLength`.
* Understand what is writing to settings on prior run.  Not a problem but want to know.
* Consider moving `${getInput}` abd `${default}` up to `getSpecialVariables()`.

## Release Notes
