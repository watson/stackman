'use strict'

require('longjohn')
var test = require('tape')
var stackman = require('../')

test('longjohn, regular error', function (t) {
  var err = new Error('foo')
  var callsites = stackman.callsites(err)
  t.ok(callsites.length > 0, 'should have stack frames')
  t.end()
})

test('longjohn, thrown error', function (t) {
  try {
    throw new Error('foo')
  } catch (err) {
    var callsites = stackman.callsites(err)
    t.ok(callsites.length > 0, 'should have stack frames')
    t.end()
  }
})
