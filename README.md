# Stackman

A node.js module that creates rich stacktraces

## Install

```
npm install stackman
```

## Basic usage

```javascript
var stackman = require('stackman')();

var err = new Error('Oops!');

stackman(err, function (stack) {
  // stack is an array of callsite objects
  stack.forEach(function (frame) {
    // example: <example.js:3> var err = new Error('Oops!');
    console.log('<%s:%s> %s',
      frame.getFileName(),
      frame.getLineNumber(),
      frame.context.line);
  });
});
```

## API

### Module

Parse options to the main stackman function to customize the default
behavior:

```javascript
var options = {
  lines_of_context: 5
};
var stackman = require('stackman')(options);
```

The `stackman` function takes two arguments:

- `err` - the error to be parsed
- `callback` - a callback which will be called with an array of callsite stack-frames when the parsing is completed

### Callsite

#### Custom properties

- `callsite.context.pre` - The lines before the main callsite line
- `callsite.context.line` - The main callsite line
- `callsite.context.post` - The lines after the main callsite line

#### Custom methods

- `callsite.getFunctionNameSanitized()`
- `callsite.getModuleName()` - Returns the name of the module if `isModule()` is true
- `callsite.isApp()` - Is this inside the app? (i.e. not native, not node code and not a nodule inside the node_modules directory)
- `callsite.isModule()` - Is this inside the node_modules directory?
- `callsite.isNode()` - Is this inside node core?

#### Methods inherited from V8

The follwoing methods are inherited from the [V8 stack trace
API](https://code.google.com/p/v8/wiki/JavaScriptStackTraceApi).

- `callsite.getThis()` - returns the value of this
- `callsite.getTypeName()` - returns the type of this as a string. This is the name of the function stored in the constructor field of this, if available, otherwise the object's [[Class]] internal property.
- `callsite.getFunction()` - returns the current function
- `callsite.getFunctionName()` - returns the name of the current function, typically its name property. If a name property is not available an attempt will be made to try to infer a name from the function's context.
- `callsite.getMethodName()` - returns the name of the property of this or one of its prototypes that holds the current function
- `callsite.getFileName()` - if this function was defined in a script returns the name of the script
- `callsite.getLineNumber()` - if this function was defined in a script returns the current line number
- `callsite.getColumnNumber()` - if this function was defined in a script returns the current column number
- `callsite.getEvalOrigin()` - if this function was created using a call to eval returns a CallSite object representing the location where eval was called
- `callsite.isToplevel()` - is this a toplevel invocation, that is, is this the global object?
- `callsite.isEval()` - does this call take place in code defined by a call to eval?
- `callsite.isNative()` - is this call in native V8 code?
- `callsite.isConstructor()` - is this a constructor call?

## License

MIT
