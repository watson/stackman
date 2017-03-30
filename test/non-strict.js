var test = require('tape')
var stackman = require('../')()

test('callsite.getThis()', function (t) {
  var err = new Error('foo')
  var self = this
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getThis(), self)
    t.end()
  })
})

test('callsite.getFunction()', function fn (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getFunction(), fn)
    t.end()
  })
})
