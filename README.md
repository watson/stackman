# Stackman

Give Stackman an error and he will give an array of stack frames with
extremely detailed information for each frame in the stack trace.

With Stackman you get access to the actual source code and surrounding
lines for where the error occurred, you get to know if it happened
inside a 3rd party module, in Node.js or in your own code. For a full
list of information, check out the API below.

[![Build status](https://travis-ci.org/watson/stackman.svg?branch=master)](https://travis-ci.org/watson/stackman)
[![js-standard-style](https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat)](https://github.com/feross/standard)
[![sponsor](https://img.shields.io/badge/sponsored%20by-Opbeat-3360A3.svg)](https://opbeat.com)

## Install

```
npm install stackman
```

## Basic usage

```javascript
var stackman = require('stackman')()

var err = new Error('Oops!')

stackman.callsites(err, function (err, callsites) {
  if (err) throw err

  callsites.forEach(function (callsite) {
    console.log('Error occured in at %s line %d',
      callsite.getFileName(),
      callsite.getLineNumber())
  })
})
```

## Gotchas

### `error.stack`

This module works because V8 (the JavaScript engine behind Node.js)
allows us to hook into the stack trace generator function before that
stack trace is generated. It's triggered by accessing the `.stack`
property on the Error object, so please don't do that before parsing the
error to stackman, else this will not work!

If you want to output the regular stack trace, just do so after parsing
the callsites:

```javascript
// first call stackman.callsites with the error
stackman.callsites(err, function () {...})

// then you can print out the stack trace
console.log(err.stack)
```

## Stackman API

### `var stackman = Stackman([options])`

This module exposes a single function which you must call to get a
`stackman` object.

The function takes an optional options object as its only argument.
These are the available options:

- `fileCacheMax` - When source files are read from disk, they are kept
  in memory in an LRU cache to speed up processing of future errors. You
  can change the max number of files kept in the LRU cache using this
  property (default: 500)
- `sourceMapCacheMax` - When source maps are read from disk, the
  processed source maps are kept in memory in an LRU cache to speed up
  processing of future errors. You can change the max number of source
  maps kept in the LRU cache using this property (default: 100)

### `stackman.callsites(err[, options], callback)`

Given an error object, this function will call the `callback` with an
optional error as the first argument and an array of
[CallSite](#callsite-api) objects as the 2nd (a call site is a frame in
the stack trace).

Note that any error related to loading or parsing source maps will be
suppressed. If a source map related error occurs, Stackman behaves as if
the `sourcemap` option is `false`.

Options:

- `sourcemap` - A boolean specifying if Stackman should look for an
  process source maps (default: `true`)

### `var properties = stackman.properties(err)`

Given an error object, this function will return an object containing
all the custom properties from the original error object (beside date
objects, properties of type `object` and `function` are not included in
this object).

### `stackman.sourceContexts(callsites[, options], callback)`

Convenience function to get the source context for all call sites in the
`callsites` argument in one go (instead of iterating over the call sites
and calling
[`callsite.sourceContext()`](#callsitesourcecontextoptions-callback) for
each of them).

Calls the `callback` with an optional error object as the first argument
and an array of [source context objects](#source-context) as the 2nd.
Each element in the context array matches a call site in the `callsites`
array. The optional `options` object will be passed on to
[`callsite.sourceContext()`](#callsitesourcecontextoptions-callback).

All node core call sites will have the context value `null`.

## CallSite API

A CallSite object is an object provided by the [V8 stack trace
API](https://github.com/v8/v8/wiki/Stack-Trace-API) representing a frame
in the stack trace. Stackman will decorate each CallSite object with
custom functions and behavior.

### `callsite.sourcemap`

If source map support is enabled and a source map have been found for
the CallSite, this property will be a reference to a
[`SourceMapConsumer`](https://github.com/mozilla/source-map#sourcemapconsumer)
object representing the given CallSite.

If set, all functions on the CallSite object will be source map aware.
I.e. their return values will be related to the original source code and
not the transpiled source code.

### `var val = callsite.getThis()`

_Inherited from V8_

Returns the value of `this`.

To maintain restrictions imposed on strict mode functions, frames that
have a strict mode function and all frames below (its caller etc.) are
not allow to access their receiver and function objects. For those
frames, `getThis()` will return `undefined`.

### `var str = callsite.getTypeName()`

_Inherited from V8_

Returns the type of `this` as a string. This is the name of the function
stored in the constructor field of `this`, if available, otherwise the
object's `[[Class]]` internal property.

### `var str = callsite.getTypeNameSafely()`

A safer version of
[`callsite.getTypeName()`](#var-str--callsitegettypename) that safely
handles an exception that sometimes is thrown when using `"use strict"`
in which case `null` is returned.

### `var fn = callsite.getFunction()`

_Inherited from V8_

Returns the current function.

To maintain restrictions imposed on strict mode functions, frames that
have a strict mode function and all frames below (its caller etc.) are
not allow to access their receiver and function objects. For those
frames, `getFunction()` will return `undefined`.

### `var str = callsite.getFunctionName()`

_Inherited from V8_

Returns the name of the current function, typically its name property.
If a name property is not available an attempt will be made to try to
infer a name from the function's context.

### `var str = callsite.getFunctionNameSanitized()`

Guaranteed to always return the most meaningful function name. If none
can be determined, the string `<anonymous>` will be returned.

### `var str = callsite.getMethodName()`

_Inherited from V8_

Returns the name of the property of this or one of its prototypes that
holds the current function.

### `var str = callsite.getFileName()`

_Inherited from V8 if `callsite.sourcemap` is `undefined`_

If this function was defined in a script returns the name of the script.

### `var str = callsite.getRelativeFileName()`

Returns a filename realtive to `process.cwd()`.

### `var num = callsite.getLineNumber()`

_Inherited from V8 if `callsite.sourcemap` is `undefined`_

If this function was defined in a script returns the current line
number.

### `var num = callsite.getColumnNumber()`

_Inherited from V8 if `callsite.sourcemap` is `undefined`_

If this function was defined in a script returns the current column
number.

### `var str = callsite.getEvalOrigin()`

_Inherited from V8_

If this function was created using a call to eval returns a CallSite
object representing the location where eval was called.

### `var str = callsite.getModuleName()`

Returns the name of the module if `isModule()` is `true`. Otherwise
returns `null`.

### `var bool = callsite.isToplevel()`

_Inherited from V8_

Is this a toplevel invocation, that is, is this the global object?

### `var bool = callsite.isEval()`

_Inherited from V8_

Does this call take place in code defined by a call to eval?

### `var bool = callsite.isNative()`

_Inherited from V8_

Is this call in native V8 code?

### `var bool = callsite.isConstructor()`

_Inherited from V8_

Is this a constructor call?

### `var bool = callsite.isApp()`

Is this inside the app? (i.e. not native, not node code and not a module
inside the `node_modules` directory)

### `var bool = callsite.isModule()`

Is this inside the `node_modules` directory?

### `var bool = callsite.isNode()`

Is this inside node core?

### `callsite.sourceContext([options, ]callback)`

Calls the `callback` with an optional error object as the first argument
and a [source context object](#source-context) as the 2nd.

If the `callsite` is a node core call site, the `callback` will be
called with an error.

Options:

- `lines` - Number of lines of soruce context to be loaded on each side
  of the call site line (default: `7`)

## Source Context

The source context objects provided by
[`callsite.sourceContext`](#callsitesourcecontextoptions-callback)
contains the following properties:

- `pre` - The lines before the main callsite line
- `line` - The main callsite line
- `post` - The lines after the main callsite line

## Troubleshooting

To enable debug mode, set the environment variable `DEBUG=stackman`.

## Acknowledgements

This project was kindly sponsored by [Opbeat](https://opbeat.com).

## License

MIT
