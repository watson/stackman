'use strict'

var fs = require('fs')
var test = require('tape')
var afterAll = require('after-all')
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
  Stackman()(err, function (stack) {
    t.ok(typeof stack === 'object', 'should be an object')
    t.ok(typeof stack.properties === 'object', 'should be an object')
    t.ok(Array.isArray(stack.frames), 'should be an array')
    t.ok(stack.frames.length > 0, 'should have at least one element')
    t.equal(typeof stack.frames[0].getFileName, 'function')
    t.end()
  })
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
  var err = new Error()
  var next = afterAll(t.end)
  var cb1 = next()
  var cb2 = next()
  var s1 = Stackman({ context: 1 })
  var s2 = Stackman({ context: 2 })
  s1(err, function (stack) {
    var frame = stack.frames[0]
    t.equal(frame.context.pre.length, 1)
    t.equal(frame.context.post.length, 1)
    cb1()
  })
  s2(err, function (stack) {
    var frame = stack.frames[0]
    t.equal(frame.context.pre.length, 2)
    t.equal(frame.context.post.length, 2)
    cb2()
  })
})
