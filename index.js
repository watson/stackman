'use strict'

var fs = require('fs')
var stackback = require('stackback')
var afterAll = require('after-all')

var LINES_OF_CONTEXT = 7

module.exports = function (opts) {
  if (opts instanceof Error) throw new Error('Stackman not initialized yet. Please do so first and parse the error to the returned function instead')

  var lines_of_context = (opts || {}).context || LINES_OF_CONTEXT

  var parseLines = function (lines, callsite) {
    var lineno = callsite.getLineNumber()
    return {
      pre: lines.slice(Math.max(0, lineno - (lines_of_context + 1)), lineno - 1),
      line: lines[lineno - 1],
      post: lines.slice(lineno, lineno + lines_of_context)
    }
  }

  return function (err, cb) {
    var stack = stackback(err)
    var cache = {}

    var next = afterAll(function () {
      cb({
        properties: getProperties(err),
        frames: stack
      })
    })

    if (!validStack(stack)) return next()()

    stack.forEach(function (callsite) {
      callsite.getRelativeFileName = getRelativeFileName.bind(callsite)
      callsite.getTypeNameSafely = getTypeNameSafely.bind(callsite)
      callsite.getFunctionNameSanitized = getFunctionNameSanitized.bind(callsite)
      callsite.getModuleName = getModuleName.bind(callsite)
      callsite.isApp = isApp.bind(callsite)
      callsite.isModule = isModule.bind(callsite)
      callsite.isNode = isNode.bind(callsite)

      var done = next()

      if (callsite.isNode()) return done() // internal Node files are not full path names. Ignore them.

      var filename = callsite.getFileName() || ''

      if (filename in cache) {
        callsite.context = parseLines(cache[filename], callsite)
        done()
      } else {
        fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
          if (!err) {
            data = data.split(/\r?\n/)
            cache[filename] = data
            callsite.context = parseLines(data, callsite)
          }
          done()
        })
      }
    })
  }

}

var validStack = function (stack) {
  return Array.isArray(stack) &&
         typeof stack[0] === 'object' &&
         typeof stack[0].getFileName === 'function'
}

var getRelativeFileName = function () {
  var filename = this.getFileName()
  if (!filename) return
  var root = process.cwd() + '/'
  return !~filename.indexOf(root) ? filename : filename.substr(root.length)
}

var getTypeNameSafely = function () {
  try {
    return this.getTypeName()
  } catch (e) {
    // This seems to happen sometimes when using 'use strict',
    // stemming from `getTypeName`.
    // [TypeError: Cannot read property 'constructor' of undefined]
    return null
  }
}

var getFunctionNameSanitized = function () {
  var fnName = this.getFunctionName()
  if (fnName) return fnName
  var typeName = this.getTypeNameSafely()
  if (typeName) return typeName + '.' + (this.getMethodName() || '<anonymous>')
  return '<anonymous>'
}

var getModuleName = function () {
  var filename = this.getFileName() || ''
  var match = filename.match(/.*node_modules\/([^\/]*)/)
  if (match) return match[1]
}

var isApp = function () {
  return !this.isNode() && !~(this.getFileName() || '').indexOf('node_modules/')
}

var isModule = function () {
  return !!~(this.getFileName() || '').indexOf('node_modules/')
}

var isNode = function () {
  if (this.isNative()) return true
  var filename = this.getFileName() || ''
  return (filename[0] !== '/' && filename[0] !== '.')
}

var getProperties = function (err) {
  var properties = {}
  Object.keys(err).forEach(function (key) {
    if (key === 'stack') return // 'stack' seems to be enumerable in Node 0.11
    var val = err[key]
    switch (typeof val) {
      case 'function':
      case 'object':
        return
      default:
        properties[key] = val
    }
  })
  return properties
}
