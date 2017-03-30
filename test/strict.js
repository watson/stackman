'use strict'

var fs = require('fs')
var path = require('path')
var semver = require('semver')
var test = require('tape')
var stackman = require('../')()

test('stackman.callsites()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.ok(Array.isArray(callsites))
    t.ok(callsites.length > 0, 'should have at least one element')
    callsites.forEach(function (callsite, index) {
      t.equal(typeof callsite.getThis, 'function', 'getThis should be a function')
      t.equal(typeof callsite.getTypeName, 'function', 'getTypeName should be a function')
      t.equal(typeof callsite.getTypeNameSafely, 'function', 'getTypeNameSafely should be a function')
      t.equal(typeof callsite.getFunction, 'function', 'getFunction should be a function')
      t.equal(typeof callsite.getFunctionName, 'function', 'getFunctionName should be a function')
      t.equal(typeof callsite.getFunctionNameSanitized, 'function', 'getFunctionNameSanitized should be a function')
      t.equal(typeof callsite.getMethodName, 'function', 'getMethodName should be a function')
      t.equal(typeof callsite.getFileName, 'function', 'getFileName should be a function')
      t.equal(typeof callsite.getRelativeFileName, 'function', 'getRelativeFileName should be a function')
      t.equal(typeof callsite.getLineNumber, 'function', 'getLineNumber should be a function')
      t.equal(typeof callsite.getColumnNumber, 'function', 'getColumnNumber should be a function')
      t.equal(typeof callsite.getEvalOrigin, 'function', 'getEvalOrigin should be a function')
      t.equal(typeof callsite.getModuleName, 'function', 'getModuleName should be a function')
      t.equal(typeof callsite.isToplevel, 'function', 'isToplevel should be a function')
      t.equal(typeof callsite.isEval, 'function', 'isEval should be a function')
      t.equal(typeof callsite.isNative, 'function', 'isNative should be a function')
      t.equal(typeof callsite.isConstructor, 'function', 'isConstructor should be a function')
      t.equal(typeof callsite.isApp, 'function', 'isApp should be a function')
      t.equal(typeof callsite.isModule, 'function', 'isModule should be a function')
      t.equal(typeof callsite.isNode, 'function', 'isNode should be a function')
      t.equal(typeof callsite.sourceContext, 'function', 'sourceContext should be a function')
    })
    t.end()
  })
})

test('callsite.getThis()', function (t) {
  var err = new Error('foo')
  var self = this
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    if (semver.gte(process.version, '0.12.0')) {
      t.equal(callsite.getThis(), undefined)
    } else {
      t.equal(callsite.getThis(), self)
    }
    t.end()
  })
})

test('callsite.getTypeName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getTypeName(), 'Test')
    t.end()
  })
})

test('callsite.getTypeNameSafely()', function (t) {
  // TODO: It would be nice if we could the the non-safe version to
  // throw in a test
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getTypeNameSafely(), 'Test')
    t.end()
  })
})

test('callsite.getFunction()', function fn (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    if (semver.gte(process.version, '0.12.0')) {
      t.equal(callsite.getFunction(), undefined)
    } else {
      t.equal(callsite.getFunction(), fn)
    }
    t.end()
  })
})

test('callsite.getFunctionName() - anonymous', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFunctionName(), null)
    t.end()
  })
})

test('callsite.getFunctionName() - named', function named (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFunctionName(), 'named')
    t.end()
  })
})

test('callsite.getFunctionNameSanitized() - anonymous', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFunctionNameSanitized(), 'Test.<anonymous>')
    t.end()
  })
})

test('callsite.getFunctionNameSanitized() - named', function named (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFunctionNameSanitized(), 'named')
    t.end()
  })
})

test('callsite.getMethodName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getMethodName(), null)
    t.end()
  })
})

test('callsite.getFileName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFileName(), __filename)
    t.end()
  })
})

test('callsite.getRelativeFileName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getRelativeFileName(), 'test/strict.js')
    t.end()
  })
})

test('callsite.getLineNumber()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.ok(callsites[0].getLineNumber() > 1)
    t.end()
  })
})

test('callsite.getColumnNumber()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getColumnNumber(), 13)
    t.end()
  })
})

test('callsite.getEvalOrigin()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getEvalOrigin(), __filename)
    t.end()
  })
})

test('callsite.getModuleName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    if (__filename.indexOf(path.sep + 'node_modules' + path.sep) === -1) {
      t.equal(callsite.getModuleName(), null)
    } else {
      t.equal(callsite.getModuleName(), 'stackman')
    }
    t.end()
  })
})

test('callsite.isToplevel()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].isToplevel(), false)
    t.end()
  })
})

test('callsite.isEval()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].isEval(), false)
    t.end()
  })
})

test('callsite.isNative()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].isNative(), false)
    t.end()
  })
})

test('callsite.isConstructor()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].isConstructor(), false)
    t.end()
  })
})

test('callsite.isApp()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    if (__filename.indexOf(path.sep + 'node_modules' + path.sep) === -1) {
      t.equal(callsite.isApp(), true)
    } else {
      t.equal(callsite.isApp(), false)
    }
    t.end()
  })
})

test('callsite.isModule()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    if (__filename.indexOf(path.sep + 'node_modules' + path.sep) === -1) {
      t.equal(callsite.isModule(), false)
    } else {
      t.equal(callsite.isModule(), true)
    }
    t.end()
  })
})

test('callsite.isNode()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].isNode(), false)
    t.end()
  })
})

test('callsite.sourceContext()', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    callsites[0].sourceContext(function (err, context) {
      t.error(err)
      t.equal(typeof context, 'object')
      t.equal(typeof context.line, 'string')
      t.ok(Array.isArray(context.pre), 'should be an array')
      t.ok(Array.isArray(context.post), 'should be an array')
      t.equal(context.pre.length, 7)
      t.equal(context.post.length, 7)
      t.end()
    })
  })
})

test('callsite.sourceContext() - node core', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    var callsite = callsites[0]
    Object.defineProperty(callsite, 'isNode', {
      writable: true,
      value: function () { return true }
    })

    callsites[0].sourceContext(function (err, context) {
      t.equal(err.message, 'Can\'t get source context of a Node core callsite')
      t.end()
    })
  })
})

test('callsite.sourceContext({lines: 2})', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    callsites[0].sourceContext({lines: 2}, function (err, context) {
      t.error(err)
      t.equal(context.pre.length, 2)
      t.equal(context.post.length, 2)
      t.end()
    })
  })
})

test('stackman.properties()', function (t) {
  fs.readFile('./no_such_file', function (err) {
    err.foo = 'bar'
    var props = stackman.properties(err)
    t.equal(props.errno, err.errno)
    t.equal(props.code, 'ENOENT')
    t.equal(props.path, './no_such_file')
    t.equal(props.foo, 'bar')
    t.end()
  })
})

test('stackman.sourceContexts(callsites)', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    stackman.sourceContexts(callsites, function (err, contexts) {
      t.error(err)
      contexts.forEach(function (context, index) {
        var callsite = callsites[index]

        if (callsite.isNode()) {
          t.equal(context, null)
        } else {
          t.equal(typeof context, 'object')
          t.equal(typeof context.line, 'string')
          t.ok(Array.isArray(context.pre), 'should be an array')
          t.ok(Array.isArray(context.post), 'should be an array')
          t.equal(context.pre.length, 7)
          t.equal(context.post.length, 7)
        }
      })
      t.end()
    })
  })
})

test('stackman.sourceContexts(callsites, {lines: 2})', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    stackman.sourceContexts(callsites, {lines: 2}, function (err, contexts) {
      t.error(err)
      contexts.forEach(function (context, index) {
        var callsite = callsites[index]

        if (callsite.isNode()) {
          t.equal(context, null)
        } else {
          t.equal(typeof context, 'object')
          t.equal(typeof context.line, 'string')
          t.ok(Array.isArray(context.pre), 'should be an array')
          t.ok(Array.isArray(context.post), 'should be an array')
          t.equal(context.pre.length, 2)
          t.equal(context.post.length, 2)
        }
      })
      t.end()
    })
  })
})
