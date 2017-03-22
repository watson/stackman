'use strict'

require('longjohn')
var test = require('tape')
var Stackman = require('../')

test('longjohn, regular error', function (t) {
  var err = new Error('foo')
  var stack = Stackman()(err)
  t.ok(stack.frames.length > 0, 'should have stack frames')
  t.end()
})

test('longjohn, thrown error', function (t) {
  try {
    throw new Error('foo')
  } catch (err) {
    var stack = Stackman()(err)
    t.ok(stack.frames.length > 0, 'should have stack frames')
    t.end()
  }
})
