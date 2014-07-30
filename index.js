'use strict';

var fs = require('fs');
var stackback = require('stackback');
var afterAll = require('after-all');

var LINES_OF_CONTEXT = 7;

module.exports = function (options) {
  if (options instanceof Error)
    throw new Error('Stackman not initialized yet. Please do so first and use the returned function instead');

  var lines_of_context = (options || {}).context || LINES_OF_CONTEXT;

  var parser = function (err, callback) {
    var stack = stackback(err),
        cache = {},
        outstanding, next;

    next = afterAll(function () {
      callback(stack);
    });

    if (!validStack(stack)) return next();

    outstanding = stack.length;

    stack.forEach(function (callsite) {
      callsite.getFunctionNameSanitized = getFunctionNameSanitized.bind(callsite);
      callsite.getModuleName = getModuleName.bind(callsite);
      callsite.isApp = isApp.bind(callsite);
      callsite.isModule = isModule.bind(callsite);
      callsite.isNode = isNode.bind(callsite);

      var cb = next();

      if (callsite.isNode()) return cb(); // internal Node files are not full path names. Ignore them.

      var filename = callsite.getFileName() || '';

      if (filename in cache) {
        callsite.context = parseLines(cache[filename], callsite);
        cb();
      } else {
        fs.readFile(filename, { encoding: 'utf8' }, function (err, data) {
          if (!err) {
            data = data.split(/\r?\n/);
            cache[filename] = data;
            callsite.context = parseLines(data, callsite);
          }
          cb();
        });
      }
    });
  };

  var parseLines = function (lines, callsite) {
    var lineno = callsite.getLineNumber();
    return {
      pre: lines.slice(Math.max(0, lineno - (lines_of_context + 1)), lineno - 1),
      line: lines[lineno - 1],
      post: lines.slice(lineno, lineno + lines_of_context)
    };
  };

  return parser;
};

var validStack = function (stack) {
  return Array.isArray(stack) &&
         typeof stack[0] === 'object' &&
         typeof stack[0].getFileName === 'function';
};

var getFunctionNameSanitized = function () {
  try {
    return this.getFunctionName() ||
           this.getTypeName() + '.' + (this.getMethodName() || '<anonymous>');
  } catch (e) {
    // This seems to happen sometimes when using 'use strict',
    // stemming from `getTypeName`.
    // [TypeError: Cannot read property 'constructor' of undefined]
    return '<anonymous>';
  }
};

var getModuleName = function () {
  var filename = this.getFileName() || '';
  var match = filename.match(/node_modules\/([^\/]*)/);
  if (match) return match[1];
}

var isApp = function () {
  var filename = this.getFileName() || '';
  return !this.isNode() && !~filename.indexOf('node_modules/')
};

var isModule = function () {
  return !!~(this.getFileName() || '').indexOf('node_modules/');
};

var isNode = function () {
  if (this.isNative()) return true;
  var filename = this.getFileName() || '';
  return (filename[0] !== '/' && filename[0] !== '.');
};
