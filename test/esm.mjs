import test from 'tape'
import createStackman from '../index.js'

const stackman = createStackman()

test('callsite.getRelativeFileName()', function (t) {
  var err = new Error('foo')
  stackman.callsites(err, function (err, callsites) {
    t.error(err)
    t.equal(callsites[0].getRelativeFileName(), 'test/esm.mjs')
    t.end()
  })
})

test('callsite.sourceContext()', function (t) {
  var err = new Error()
  stackman.callsites(err, function (err, callsites) {
    t.error(err)

    callsites[0].sourceContext(function (err, context) {
      t.error(err)
      t.equal(typeof context, 'object')
      t.equal(typeof context.line, 'string')
      t.ok(Array.isArray(context.pre), 'should be an array')
      t.ok(Array.isArray(context.post), 'should be an array')
      t.equal(context.pre.length, 2)
      t.equal(context.post.length, 2)
      t.equal(context.line.trim(), 'var err = new Error()')
      t.end()
    })
  })
})
