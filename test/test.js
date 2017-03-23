'use strict'

var fs = require('fs')
var test = require('tape')
var afterAll = require('after-all')
var semver = require('semver')
var Stackman = require('../')

test('should override getTypeName() and safely catch exception', function (t) {
  process.nextTick(function () {
    var err = new Error('foo')
    var stack = Stackman()(err)
    var frame = stack.frames[0]
    var name = frame.getFunctionNameSanitized()
    t.equal(name, '<anonymous>', 'should safely catch exception')
    t.end()
  })
})

test('should call the callback with a stack object', function (t) {
  var err = new Error()
  var stack = Stackman()(err)
  t.ok(typeof stack === 'object', 'should be an object')
  t.ok(typeof stack.properties === 'object', 'should be an object')
  t.ok(Array.isArray(stack.frames), 'should be an array')
  t.ok(stack.frames.length > 0, 'should have at least one element')
  t.equal(typeof stack.frames[0].getFileName, 'function')
  t.end()
})

test('should add custom properties to the stack object', function (t) {
  fs.readFile('./no_such_file', function (err) {
    var stack = Stackman()(err)
    t.equal(stack.properties.errno, err.errno)
    t.equal(stack.properties.code, 'ENOENT')
    t.equal(stack.properties.path, './no_such_file')
    t.end()
  })
})

test('should add extra functions', function (t) {
  var err = new Error()
  var stack = Stackman()(err)
  var frame = stack.frames[0]
  t.equal(typeof frame.getFunctionNameSanitized, 'function')
  t.equal(typeof frame.getModuleName, 'function')
  t.equal(typeof frame.sourceContext, 'function')
  t.equal(typeof frame.isApp, 'function')
  t.equal(typeof frame.isModule, 'function')
  t.equal(typeof frame.isNode, 'function')
  t.end()
})

test('should create context object', function (t) {
  var err = new Error()
  var stack = Stackman()(err)
  var frame = stack.frames[0]

  frame.sourceContext(function (err, context) {
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

test('should respect the context option', function (t) {
  var err = new Error()
  var stack = Stackman({ context: 2 })(err)
  var frame = stack.frames[0]

  frame.sourceContext(function (err, context) {
    t.error(err)
    t.equal(context.pre.length, 2)
    t.equal(context.post.length, 2)
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

  var stack1 = s1(err1)
  setTimeout(function () {
    var frame = stack1.frames[0]
    frame.sourceContext(function (err, context) {
      t.error(err)
      t.equal(context.pre.length, 1)
      t.equal(context.post.length, 1)
      cb1()
    })
  }, 50)

  var stack2 = s2(err2)
  setTimeout(function () {
    var frame = stack2.frames[0]
    frame.sourceContext(function (err, context) {
      t.error(err)
      t.equal(context.pre.length, 2)
      t.equal(context.post.length, 2)
      cb2()
    })
  }, 50)
})

test('filter string', function (t) {
  var err = new Error()
  var opts = {
    filter: 'stackman'
  }
  var stack = Stackman(opts)(err)
  t.equal(stack.frames.length, nonStackmanFrames())
  t.ok(stack.frames[0].isNode())
  t.end()
})

test('filter array', function (t) {
  var err = new Error()
  var opts = {
    filter: ['node_modules/tape/lib/test.js', 'node_modules/tape/lib/results.js']
  }
  var stack = Stackman(opts)(err)
  t.equal(stack.frames.length, nonStackmanFrames() + 1)
  t.ok(stack.frames[0].getFileName().indexOf('/test/test.js') !== -1)
  t.end()
})

// The different versions of Node.js have implemented timers with a different
// number of function calls. This is just a simple hack to get around it.
function nonStackmanFrames () {
  if (semver.lt(process.version, '5.0.0')) return 1
  if (semver.lt(process.version, '6.0.0')) return 2
  return 3
}
