var test = require('tape')
var stackman = require('../')

test('callsite.getThis()', function (t) {
  var err = new Error('foo')
  var callsite = stackman.callsites(err)[0]
  t.equal(callsite.getThis(), this)
  t.end()
})

test('callsite.getFunction()', function fn (t) {
  var err = new Error('foo')
  var callsite = stackman.callsites(err)[0]
  t.equal(callsite.getFunction(), fn)
  t.end()
})
