'use strict'

var test = require('tape')
var generateError = require('./fixtures/generateError')
var stackman = require('../')

test('sourcemapped location getters', function (t) {
  var err = generateError()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    t.ok(callsite.getFileName().indexOf('/generateError.original.js') !== -1)
    t.equal(callsite.getLineNumber(), 2)
    t.equal(callsite.getColumnNumber(), 53)
    t.end()
  })
})

test('sourcemapped location getters fall back if no sourcemap exists', function (t) {
  stackman.callsites(new Error(), function (err, callsites) {
    t.error(err)
    var callsite = callsites[0]
    t.equal(callsite.getFileName(), __filename)
    t.notEqual(callsite.getLineNumber(), 2)
    t.notEqual(callsite.getColumnNumber(), 53)
    t.end()
  })
})

test('sourcemapped context', function (t) {
  var err = generateError()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    callsites[0].sourceContext(function (err, context) {
      t.error(err)
      t.deepEqual(context, {
        pre: ['// Just a little prefixing line'],
        line: 'const generateError = (errMessage = \'Some error\') => new Error(errMessage)',
        post: ['', 'module.exports = generateError', '']
      })
      t.end()
    })
  })
})
