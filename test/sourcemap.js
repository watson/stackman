'use strict'

var path = require('path')
var test = require('tape')
var stackman = require('../')()

test('source maps disabled', function (t) {
  var err = require('./fixtures/lib/error')()
  stackman.callsites(err, {sourcemap: false}, assertSourceMapNotLoaded.bind(null, t, 'error.js'))
})

test('source map inlined', function (t) {
  var err = require('./fixtures/lib/error-inline')()
  stackman.callsites(err, assertSourceFound.bind(null, t))
})

test('source map linked', function (t) {
  t.test('source mapped source code embedded', function (t) {
    var err = require('./fixtures/lib/error-src-embedded')()
    stackman.callsites(err, assertSourceFound.bind(null, t))
  })

  t.test('source mapped source code on disk', function (t) {
    var err = require('./fixtures/lib/error')()
    stackman.callsites(err, assertSourceFound.bind(null, t))
  })

  t.test('source mapped source code not found', function (t) {
    var err = require('./fixtures/lib/error-src-missing')()
    stackman.callsites(err, assertSourceNotFound.bind(null, t))
  })
})

test('fails', function (t) {
  t.test('inlined source map broken', function (t) {
    var err = require('./fixtures/lib/error-inline-broken')()
    stackman.callsites(err, assertSourceMapNotLoaded.bind(null, t, 'error-inline-broken.js'))
  })

  t.test('linked source map not found', function (t) {
    var err = require('./fixtures/lib/error-map-missing')()
    stackman.callsites(err, assertSourceMapNotLoaded.bind(null, t, 'error-map-missing.js'))
  })

  t.test('linked source map broken', function (t) {
    var err = require('./fixtures/lib/error-broken')()
    stackman.callsites(err, assertSourceMapNotLoaded.bind(null, t, 'error-broken.js'))
  })
})

function assertSourceMapNotLoaded (t, filename, err, callsites) {
  t.error(err)
  var callsite = callsites[0]
  t.equal(callsite.getFileName(), path.join(__dirname, 'fixtures', 'lib', filename))
  t.equal(callsite.getRelativeFileName(), path.join('test', 'fixtures', 'lib', filename))
  t.equal(callsite.getLineNumber(), 6)
  t.equal(callsite.getColumnNumber(), 10)
  t.equal(callsite.getFunctionName(), 'generateError')
  t.equal(callsite.getFunctionNameSanitized(), 'generateError')
  t.equal(callsite.isApp(), __dirname.indexOf('node_modules') === -1)
  callsite.sourceContext(function (err, context) {
    t.error(err)
    t.equal(context.line, '  return new Error(msg);')
    t.end()
  })
}

function assertSourceFound (t, err, callsites) {
  t.error(err)
  var callsite = callsites[0]
  t.equal(callsite.getFileName(), path.join(__dirname, 'fixtures', 'src', 'error.js'))
  t.equal(callsite.getRelativeFileName(), path.join('test', 'fixtures', 'src', 'error.js'))
  t.equal(callsite.getLineNumber(), 2)
  t.equal(callsite.getColumnNumber(), 39)
  t.equal(callsite.getFunctionName(), 'generateError')
  t.equal(callsite.getFunctionNameSanitized(), 'generateError')
  t.equal(callsite.isApp(), __dirname.indexOf('node_modules') === -1)
  callsite.sourceContext(function (err, context) {
    t.error(err)
    t.deepEqual(context.pre, ['// Just a little prefixing line'])
    t.equal(context.line, 'const generateError = (msg = \'foo\') => new Error(msg)')
    t.deepEqual(context.post, ['', 'module.exports = generateError', ''])
    t.end()
  })
}

function assertSourceNotFound (t, err, callsites) {
  t.error(err)
  var callsite = callsites[0]
  t.equal(callsite.getFileName(), path.join(__dirname, 'fixtures', 'src', 'not', 'found.js'))
  t.equal(callsite.getRelativeFileName(), path.join('test', 'fixtures', 'src', 'not', 'found.js'))
  t.equal(callsite.getLineNumber(), 2)
  t.equal(callsite.getColumnNumber(), 39)
  t.equal(callsite.getFunctionName(), 'generateError')
  t.equal(callsite.getFunctionNameSanitized(), 'generateError')
  t.equal(callsite.isApp(), __dirname.indexOf('node_modules') === -1)
  callsite.sourceContext(function (err, context) {
    t.equal(err.code, 'ENOENT')
    t.equal(context, undefined)
    t.end()
  })
}
