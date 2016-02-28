# Stackman

Give Stackman an error and he will give an array of stack frames with
extremely detailed information for each frame in the stack trace.

With Stackman you get access to the actual source code and surrounding
lines for where the error occurred, you get to know if it happened
inside a 3rd party module, in Node.js or in your own code. For a full
list of information, check out the API below.

[![Build status](https://travis-ci.org/watson/stackman.svg?branch=master)](https://travis-ci.org/watson/stackman)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)

## Install

```
npm install stackman
```

## Basic usage

```javascript
var stackman = require('stackman')();

var err = new Error('Oops!');

stackman(err, function (stack) {
  stack.frames.forEach(function (frame) {
    // output: <example.js:3> var err = new Error('Oops!');
    console.log('<%s:%s> %s',
      frame.getFileName(),
      frame.getLineNumber(),
      frame.context.line);
  });
});
```

## Gotchas

### `error.stack`

This works because V8 (the JavaScript engine behind Node.js) allows us
to hook into the stack trace generator function before that stack trace
is generated. It's triggered by accessing the `.stack` property on the
Error object, so please don't do that before parsing the error to
stackman, else this will not work!

If you want to output the regular stack trace, just do so after parsing
it to stackman:

```javascript
// first call stackman with the error
stackman(err, ...);

// then you can print out the stack trace
console.log(err.stack);
```

## API

### Module

Parse options to the main stackman function to customize the default
behavior:

```javascript
var options = {
  context: 5,
  filter: '/node_modules/my-module/'
}
var stackman = require('stackman')(options)
```

Options:

- `context` - Number of lines of context to be loaded on each side of
  the callsite line (default: `7`)
- `filter` - Accepts a single path segment or an array of path segments.
  Will filter out any stack frames that matches the given path segments.
- `sync` - Set to `true` if you want stackman to behave synchronously.
  If set, the result will be returned and the callback will be ignored
  (default: `false`)

The `stackman` function takes two arguments:

- `err` - the error to be parsed
- `callback` - a callback which will be called with the a stack object
  when the parsing is completed

#### The `stack` object:

The callback given to the `stackman` function is called with a stack
object when the parsing is completed. The `stack` object have two
important properties:

- `properties` - An object containing all the custom properties from the
  original error object (properties of type `object` and `function` are
  not included in this object)
- `frames` - An array of stack-frames, also called callsite objects

### Callsite

#### Custom properties

- `callsite.context.pre` - The lines before the main callsite line
- `callsite.context.line` - The main callsite line
- `callsite.context.post` - The lines after the main callsite line

#### Custom methods

- `callsite.getTypeNameSafely()` - A safer version of
  `callsite.getTypeName()` as this safely handles an exception that
  sometimes is thrown when using `"use strict"`. Otherwise it returns
  the type of this as a string. This is the name of the function stored
  in the constructor field of this, if available, otherwise the object's
  [[Class]] internal property
- `callsite.getRelativeFileName()` - Returns a filename realtive to `process.cwd()`
- `callsite.getFunctionNameSanitized()` - Guaranteed to always return
  the most meaningful function name. If none can be determined, the
  string `<anonymous>` will be returned
- `callsite.getModuleName()` - Returns the name of the module if
  `isModule()` is true
- `callsite.isApp()` - Is this inside the app? (i.e. not native, not
  node code and not a module inside the node_modules directory)
- `callsite.isModule()` - Is this inside the node_modules directory?
- `callsite.isNode()` - Is this inside node core?

#### Methods inherited from V8

The follwoing methods are inherited from the [V8 stack trace
API](https://code.google.com/p/v8-wiki/wiki/JavaScriptStackTraceApi).

- `callsite.getThis()` - returns the value of this
- `callsite.getTypeName()` - returns the type of this as a string. This
  is the name of the function stored in the constructor field of this,
  if available, otherwise the object's [[Class]] internal property.
- `callsite.getFunction()` - returns the current function
- `callsite.getFunctionName()` - returns the name of the current
  function, typically its name property. If a name property is not
  available an attempt will be made to try to infer a name from the
  function's context.
- `callsite.getMethodName()` - returns the name of the property of this
  or one of its prototypes that holds the current function
- `callsite.getFileName()` - if this function was defined in a script
  returns the name of the script
- `callsite.getLineNumber()` - if this function was defined in a script
  returns the current line number
- `callsite.getColumnNumber()` - if this function was defined in a
  script returns the current column number
- `callsite.getEvalOrigin()` - if this function was created using a call
  to eval returns a CallSite object representing the location where eval
  was called
- `callsite.isToplevel()` - is this a toplevel invocation, that is, is
  this the global object?
- `callsite.isEval()` - does this call take place in code defined by a
  call to eval?
- `callsite.isNative()` - is this call in native V8 code?
- `callsite.isConstructor()` - is this a constructor call?

## Troubleshooting

To enable debug mode, set the environment variable `DEBUG=stackman`.

## License

MIT
