'use strict'

var fs = require('fs')
var path = require('path')
var asyncCache = require('async-cache')
var afterAll = require('after-all-results')
var errorCallsites = require('error-callsites')
var loadSourceMap = require('load-source-map')
var debug = require('debug')('stackman')

var isAbsolute = path.isAbsolute || require('path-is-absolute')

var LINES_OF_CONTEXT = 7
var ESCAPED_REGEX_PATH_SEP = path.sep === '/' ? '/' : '\\\\'
var MODULE_FOLDER_REGEX = new RegExp('.*node_modules' + ESCAPED_REGEX_PATH_SEP + '([^' + ESCAPED_REGEX_PATH_SEP + ']*)')

module.exports = function stackman (opts) {
  if (!opts) opts = {}

  var fileCache = asyncCache({
    max: opts.fileCacheMax || 500,
    load: function (file, cb) {
      debug('reading %s', file)
      fs.readFile(file, {encoding: 'utf8'}, cb)
    }
  })

  var sourceMapCache = asyncCache({
    max: opts.sourceMapCacheMax || 100,
    load: function (file, cb) {
      debug('loading source map for %s', file)
      loadSourceMap(file, cb)
    }
  })

  return {
    callsites: callsites,
    properties: properties,
    sourceContexts: sourceContexts
  }

  function callsites (err, opts, cb) {
    if (typeof opts === 'function') return callsites(err, null, opts)

    var _callsites = errorCallsites(err)

    if (!validStack(_callsites)) {
      process.nextTick(function () {
        cb(new Error('Could not process callsites'))
      })
    } else if (!opts || opts.sourcemap !== false) {
      sourcemapify(_callsites, function (err) {
        if (err) {
          debug('error processing source map: %s', err.message)
        }
        _callsites.forEach(extendCallsite)
        cb(null, _callsites)
      })
    } else {
      _callsites.forEach(extendCallsite)
      process.nextTick(function () {
        cb(null, _callsites)
      })
    }
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

  function validStack (callsites) {
    return Array.isArray(callsites) &&
           typeof callsites[0] === 'object' &&
           typeof callsites[0].getFileName === 'function'
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
    if (typeof opts === 'function') {
      cb = opts
      opts = {}
    }

    if (this.isNode()) {
      process.nextTick(function () {
        cb(new Error('Can\'t get source context of a Node core callsite'))
      })
      return
    }

    var callsite = this
    var filename = this.getFileName() || ''
    var source = this.sourcemap
      ? this.sourcemap.sourceContentFor(filename, true)
      : null

    if (source) {
      process.nextTick(function () {
        cb(null, parseSource(source, callsite, opts))
      })
    } else {
      fileCache.get(filename, function (err, source) {
        if (err) {
          debug('error reading %s: %s', filename, err.message)
          cb(err)
        } else {
          cb(null, parseSource(source, callsite, opts))
        }
      })
    }
  }

  function parseSource (source, callsite, opts) {
    var lines = source.split(/\r?\n/)
    var linesOfContext = opts.lines || LINES_OF_CONTEXT
    var lineno = callsite.getLineNumber()
    return {
      pre: lines.slice(Math.max(0, lineno - (linesOfContext + 1)), lineno - 1),
      line: lines[lineno - 1],
      post: lines.slice(lineno, lineno + linesOfContext)
    }
  }

  function sourcemapify (callsites, cb) {
    var next = afterAll(function (err, consumers) {
      if (err) return cb(err)

      consumers.forEach(function (consumer, index) {
        if (!consumer) return
        Object.defineProperty(callsites[index], 'sourcemap', {
          writable: true,
          value: consumer
        })
      })

      cb()
    })

    callsites.forEach(function (callsite) {
      getSourceMapConsumer(callsite, next())
    })
  }

  function getSourceMapConsumer (callsite, cb) {
    if (isNode.call(callsite)) return process.nextTick(cb)
    var filename = callsite.getFileName()
    sourceMapCache.get(filename, cb)
  }

  function extendCallsite (callsite) {
    var getLineNumber = callsite.getLineNumber
    var getColumnNumber = callsite.getColumnNumber
    var getFileName = callsite.getFileName
    var position = null
    var properties = {
      getRelativeFileName: {
        writable: true,
        value: getRelativeFileName
      },
      getTypeNameSafely: {
        writable: true,
        value: getTypeNameSafely
      },
      getFunctionNameSanitized: {
        writable: true,
        value: getFunctionNameSanitized
      },
      getModuleName: {
        writable: true,
        value: getModuleName
      },
      isApp: {
        writable: true,
        value: isApp
      },
      isModule: {
        writable: true,
        value: isModule
      },
      isNode: {
        writable: true,
        value: isNode
      },
      sourceContext: {
        writable: true,
        value: sourceContext
      }
    }

    if (callsite.sourcemap) {
      properties.getFileName = {
        writable: true,
        value: function () {
          var filename = getFileName.call(callsite)
          var sourceFile = getPosition().source
          if (!sourceFile) return filename
          var sourceDir = path.dirname(filename)
          return path.resolve(path.join(sourceDir, sourceFile))
        }
      }
      properties.getLineNumber = {
        writable: true,
        value: function () {
          return getPosition().line || getLineNumber.call(callsite)
        }
      }
      properties.getColumnNumber = {
        writable: true,
        value: function () {
          return getPosition().column || getColumnNumber.call(callsite)
        }
      }
    }

    Object.defineProperties(callsite, properties)

    function getPosition () {
      if (!position) {
        try {
          position = callsite.sourcemap.originalPositionFor({
            line: getLineNumber.call(callsite),
            column: getColumnNumber.call(callsite)
          })
        } catch (e) {
          debug('error fetching source map position: %s', e.message)
          return {}
        }
      }

      return position
    }
  }
}
