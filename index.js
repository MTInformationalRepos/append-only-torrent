var Info = require('./lib/info.js')
var Writable = require('readable-stream/writable')
var createHash = require('sha.js')
var bs = require('block-stream2')
var through = require('through2')
var writeonly = require('write-only-stream')

module.exports = function (size, fstore, cb) {
  var store = fstore(size)
  var pieces = []
  var outer = through()
  ;(function next (index, offset) {
    store.get(index, function (err, buf) {
      if (err) cb(err)
      else if (buf.length === size) {
        var hash = createHash('sha1').update(buf).digest()
        pieces.push(hash)
        next(index + 1, offset + buf.length)
      } else {
        var info = Info({
          size: size,
          offset: offset,
          remainder: buf,
          pieces: pieces
        })
        info.on('torrent', function (t) { cb(null, t) })
        info.on('stream', function (stream, offset, done) {
          stream.pipe(bs(size)).pipe(wstore(offset, done))
        })
        outer.pipe(info)
      }
    })
  })(0, 0)
  return writeonly(outer)

  function wstore (offset, end) {
    var pending = 1
    var w = new Writable
    w.once('finish', done)

    var index = Math.floor(offset / size)
    w._write = function (buf, enc, next) {
      pending ++
      store.put(index, buf, function (err) {
        if (err) return cb(err)
        done()
      })
      index++
      next()
    }
    return w

    function done () {
      if (--pending === 0) end()
    }
  }
}
