'use strict'

var fs = require('fs')
var path = require('path')
var semver = require('semver')
var afterAll = require('after-all-results')
var errorCallsites = require('error-callsites')
var debug = require('debug')('stackman')

var isAbsolute = path.isAbsolute || require('path-is-absolute')

var cache = require('async-cache')({
  max: 500,
  load: function (file, cb) {
    debug('reading ' + file)
    fs.readFile(file, READ_FILE_OPTS, cb)
  }
})

var LINES_OF_CONTEXT = 7
var READ_FILE_OPTS = semver.lt(process.version, '0.9.11') ? 'utf8' : { encoding: 'utf8' }
var ESCAPED_REGEX_PATH_SEP = path.sep === '/' ? '/' : '\\\\'
var MODULE_FOLDER_REGEX = new RegExp('.*node_modules' + ESCAPED_REGEX_PATH_SEP + '([^' + ESCAPED_REGEX_PATH_SEP + ']*)')

exports.callsites = callsites
exports.properties = properties
exports.sourceContexts = sourceContexts

function callsites (err) {
  var stack = errorCallsites(err)

  if (!validStack(stack)) return null

  stack.forEach(function (callsite) {
    Object.defineProperties(callsite, {
      getRelativeFileName: {
        writable: false,
        value: getRelativeFileName
      },
      getTypeNameSafely: {
        writable: false,
        value: getTypeNameSafely
      },
      getFunctionNameSanitized: {
        writable: false,
        value: getFunctionNameSanitized
      },
      getModuleName: {
        writable: false,
        value: getModuleName
      },
      isApp: {
        writable: false,
        value: isApp
      },
      isModule: {
        writable: false,
        value: isModule
      },
      isNode: {
        writable: false,
        value: isNode
      },
      sourceContext: {
        writable: false,
        value: sourceContext
      }
    })
  })

  return stack
}

function properties (err) {
  var properties = {}
  Object.keys(err).forEach(function (key) {
    if (key === 'stack') return // 'stack' seems to be enumerable in Node 0.11
    var val = err[key]
    if (val === null) return // null is typeof object and well break the switch below
    switch (typeof val) {
      case 'function':
        return
      case 'object':
        // ignore all objects except Dates
        if (typeof val.toISOString !== 'function') return
        val = val.toISOString()
    }
    properties[key] = val
  })
  return properties
}

function sourceContexts (callsites, opts, cb) {
  if (typeof opts === 'function') return sourceContexts(callsites, null, opts)
  if (!opts) opts = {}

  var next = afterAll(cb)

  callsites.forEach(function (callsite) {
    if (callsite.isNode()) {
      next()(null, null)
    } else {
      callsite.sourceContext(opts, next())
    }
  })
}

function validStack (stack) {
  return Array.isArray(stack) &&
         typeof stack[0] === 'object' &&
         typeof stack[0].getFileName === 'function'
}

function getRelativeFileName () {
  var filename = this.getFileName()
  if (!filename) return
  var root = process.cwd()
  if (root[root.length - 1] !== path.sep) root += path.sep
  return !~filename.indexOf(root) ? filename : filename.substr(root.length)
}

function getTypeNameSafely () {
  try {
    return this.getTypeName()
  } catch (e) {
    // This seems to happen sometimes when using 'use strict',
    // stemming from `getTypeName`.
    // [TypeError: Cannot read property 'constructor' of undefined]
    return null
  }
}

function getFunctionNameSanitized () {
  var fnName = this.getFunctionName()
  if (fnName) return fnName
  var typeName = this.getTypeNameSafely()
  if (typeName) return typeName + '.' + (this.getMethodName() || '<anonymous>')
  return '<anonymous>'
}

function getModuleName () {
  var filename = this.getFileName() || ''
  var match = filename.match(MODULE_FOLDER_REGEX)
  return match ? match[1] : null
}

function isApp () {
  return !this.isNode() && !~(this.getFileName() || '').indexOf('node_modules' + path.sep)
}

function isModule () {
  return !!~(this.getFileName() || '').indexOf('node_modules' + path.sep)
}

function isNode () {
  if (this.isNative()) return true
  var filename = this.getFileName() || ''
  return (!isAbsolute(filename) && filename[0] !== '.')
}

function sourceContext (opts, cb) {
  if (this.isNode()) {
    return process.nextTick(cb, new Error('Can\'t get source context of a Node core callsite'))
  }
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }

  var callsite = this
  var filename = this.getFileName() || ''

  cache.get(filename, function (err, data) {
    if (err) {
      debug('error reading ' + filename + ': ' + err.message)
      cb(err)
    } else {
      data = data.split(/\r?\n/)
      cb(null, parseLines(data, callsite, opts))
    }
  })
}

function parseLines (lines, callsite, opts) {
  var linesOfContext = opts.lines || LINES_OF_CONTEXT
  var lineno = callsite.getLineNumber()
  return {
    pre: lines.slice(Math.max(0, lineno - (linesOfContext + 1)), lineno - 1),
    line: lines[lineno - 1],
    post: lines.slice(lineno, lineno + linesOfContext)
  }
}
