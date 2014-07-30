'use strict';

var test = require('tape');
var afterAll = require('after-all');
var stackman = require('./');

test('should call the callback with an array of callsite objects', function (t) {
  var err = new Error();
  stackman()(err, function (stack) {
    t.ok(Array.isArray(stack), 'should be an array');
    t.ok(stack.length > 0, 'should have at least one element');
    t.equal(typeof stack[0].getFileName, 'function');
    t.end();
  });
});

test('should add extra functions', function (t) {
  var err = new Error();
  stackman()(err, function (stack) {
    var frame = stack[0];
    t.equal(typeof frame.getFunctionNameSanitized, 'function');
    t.equal(typeof frame.getModuleName, 'function');
    t.equal(typeof frame.isApp, 'function');
    t.equal(typeof frame.isModule, 'function');
    t.equal(typeof frame.isNode, 'function');
    t.end();
  });
});

test('should add context object', function (t) {
  var err = new Error();
  stackman()(err, function (stack) {
    var frame = stack[0];
    t.equal(typeof frame.context, 'object');
    t.equal(typeof frame.context.line, 'string');
    t.ok(Array.isArray(frame.context.pre), 'should be an array');
    t.ok(Array.isArray(frame.context.post), 'should be an array');
    t.equal(frame.context.pre.length, 7);
    t.equal(frame.context.post.length, 7);
    t.end();
  });
});

test('should respect the context option', function (t) {
  var err = new Error();
  stackman({ context: 2 })(err, function (stack) {
    var frame = stack[0];
    t.equal(frame.context.pre.length, 2);
    t.equal(frame.context.post.length, 2);
    t.end();
  });
});

test('should not share options between stackman functions', function (t) {
  var err = new Error();
  var next = afterAll(t.end);
  var cb1 = next();
  var cb2 = next();
  stackman({ context: 1 })(err, function (stack) {
    var frame = stack[0];
    t.equal(frame.context.pre.length, 1);
    t.equal(frame.context.post.length, 1);
    cb1();
  });
  stackman({ context: 2 })(err, function (stack) {
    var frame = stack[0];
    t.equal(frame.context.pre.length, 2);
    t.equal(frame.context.post.length, 2);
    cb2();
  });
});
