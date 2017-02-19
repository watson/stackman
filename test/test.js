'use strict'

var fs = require('fs')
var test = require('tape')
var afterAll = require('after-all')
var semver = require('semver')
var generateError = require('./fixtures/generateError')
var Stackman = require('../')

test('should override getTypeName() and safely catch exception', function (t) {
  process.nextTick(function () {
    var err = new Error('foo')
    Stackman()(err, function (stack) {
      var frame = stack.frames[0]
      var name = frame.getFunctionNameSanitized()
      t.equal(name, '<anonymous>', 'should safely catch exception')
      t.end()
    })
  })
})

test('should call the callback with a stack object', function (t) {
  var err = new Error()
  var result = Stackman()(err, function (stack) {
    t.ok(typeof stack === 'object', 'should be an object')
    t.ok(typeof stack.properties === 'object', 'should be an object')
    t.ok(Array.isArray(stack.frames), 'should be an array')
    t.ok(stack.frames.length > 0, 'should have at least one element')
    t.equal(typeof stack.frames[0].getFileName, 'function')
    t.end()
  })
  t.equal(result, undefined) // ensure only sync returns something
})

test('should add custom properties to the stack object', function (t) {
  fs.readFile('./no_such_file', function (err) {
    Stackman()(err, function (stack) {
      t.equal(stack.properties.errno, err.errno)
      t.equal(stack.properties.code, 'ENOENT')
      t.equal(stack.properties.path, './no_such_file')
      t.end()
    })
  })
})

test('should add extra functions', function (t) {
  var err = new Error()
  Stackman()(err, function (stack) {
    var frame = stack.frames[0]
    t.equal(typeof frame.getFunctionNameSanitized, 'function')
    t.equal(typeof frame.getModuleName, 'function')
    t.equal(typeof frame.isApp, 'function')
    t.equal(typeof frame.isModule, 'function')
    t.equal(typeof frame.isNode, 'function')
    t.equal(typeof frame.getSourceMappedFileName, 'function')
    t.equal(typeof frame.getSourceMappedLineNumber, 'function')
    t.equal(typeof frame.getSourceMappedColumnNumber, 'function')
    t.end()
  })
})

test('should add context object', function (t) {
  var err = new Error()
  Stackman()(err, function (stack) {
    var frame = stack.frames[0]
    t.equal(typeof frame.context, 'object')
    t.equal(typeof frame.context.line, 'string')
    t.ok(Array.isArray(frame.context.pre), 'should be an array')
    t.ok(Array.isArray(frame.context.post), 'should be an array')
    t.equal(frame.context.pre.length, 7)
    t.equal(frame.context.post.length, 7)
    t.end()
  })
})

test('should respect the context option', function (t) {
  var err = new Error()
  Stackman({ context: 2 })(err, function (stack) {
    var frame = stack.frames[0]
    t.equal(frame.context.pre.length, 2)
    t.equal(frame.context.post.length, 2)
    t.end()
  })
})

test('should not share options between stackman functions', function (t) {
  var err1 = new Error()
  var err2 = new Error()
  var next = afterAll(t.end)
  var cb1 = next()
  var cb2 = next()
  var s1 = Stackman({ context: 1 })
  var s2 = Stackman({ context: 2 })
  s1(err1, function (stack) {
    setTimeout(function () {
      var frame = stack.frames[0]
      t.equal(frame.context.pre.length, 1)
      t.equal(frame.context.post.length, 1)
      cb1()
    }, 50)
  })
  s2(err2, function (stack) {
    setTimeout(function () {
      var frame = stack.frames[0]
      t.equal(frame.context.pre.length, 2)
      t.equal(frame.context.post.length, 2)
      cb2()
    }, 50)
  })
})

test('sync', function (t) {
  var err = new Error()
  var stack = Stackman({ sync: true })(err)
  t.ok(typeof stack === 'object', 'should be an object')
  t.ok(typeof stack.properties === 'object', 'should be an object')
  t.ok(Array.isArray(stack.frames), 'should be an array')
  t.ok(stack.frames.length > 0, 'should have at least one element')
  t.equal(typeof stack.frames[0].getFileName, 'function')
  t.end()
})

test('filter string', function (t) {
  var err = new Error()
  var opts = {
    filter: 'stackman'
  }
  Stackman(opts)(err, function (stack) {
    t.equal(stack.frames.length, nonStackmanFrames())
    t.ok(stack.frames[0].isNode())
    t.end()
  })
})

test('filter array', function (t) {
  var err = new Error()
  var opts = {
    filter: ['node_modules/tape/lib/test.js', 'node_modules/tape/lib/results.js']
  }
  Stackman(opts)(err, function (stack) {
    t.equal(stack.frames.length, nonStackmanFrames() + 1)
    t.ok(stack.frames[0].getFileName().indexOf('/test/test.js') !== -1)
    t.end()
  })
})

test('sourcemapped location getters', function (t) {
  var err = generateError()
  Stackman()(err, function (stack) {
    t.ok(stack.frames[0].getSourceMappedFileName().indexOf('/generateError.original.js') !== -1)
    t.equal(stack.frames[0].getSourceMappedLineNumber(), 2)
    t.equal(stack.frames[0].getSourceMappedColumnNumber(), 53)
    t.end()
  })
})

test('sourcemapped location getters (sync)', function (t) {
  var err = generateError()
  var stack = Stackman({ sync: true })(err)
  t.ok(stack.frames[0].getSourceMappedFileName().indexOf('/generateError.original.js') !== -1)
  t.equal(stack.frames[0].getSourceMappedLineNumber(), 2)
  t.equal(stack.frames[0].getSourceMappedColumnNumber(), 53)
  t.end()
})

test('sourcemapped location getters fall back if no sourcemap exists', function (t) {
  var stack = Stackman({ sync: true })(new Error())
  t.equal(stack.frames[0].getSourceMappedFileName(), __filename)
  t.equal(stack.frames[0].getSourceMappedLineNumber(), stack.frames[0].getLineNumber())
  t.equal(stack.frames[0].getSourceMappedColumnNumber(), stack.frames[0].getColumnNumber())
  t.end()
})

test('sourcemapped context', function (t) {
  var err = generateError()
  var stack = Stackman({ sync: true })(err)
  t.deepEqual(stack.frames[0].context, {
    pre: ['// Just a little prefixing line'],
    line: 'const generateError = (errMessage = \'Some error\') => new Error(errMessage)',
    post: ['', 'module.exports = generateError', '']
  })
  t.end()
})

// The different versions of Node.js have implemented timers with a different
// number of function calls. This is just a simple hack to get around it.
function nonStackmanFrames () {
  if (semver.lt(process.version, '5.0.0')) return 1
  if (semver.lt(process.version, '6.0.0')) return 2
  return 3
}
