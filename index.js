var through = require('through2')
var defined = require('defined')
var bencode = require('bencode')
var createHash = require('sha.js')
var concat = require('concat-stream')
var sizeStream = require('fixed-size-stream-splitter')

module.exports = function (opts) {
  if (!opts) opts = {}
  if (typeof opts === 'number') opts = { size: opts }
  var size = defined(opts.size, 4096 * 1024)
  var pieces = []
  var size = 0

  var outer = sizeStream(size, function (stream) {
    var pending = 2, result = { length: size }
    stream.pipe(through(write, end))
 
    var h = createHash('sha1')
    stream.pipe(h).pipe(concat(function (hash) {
      result.hash = hash
      done()
    }))
    outer.emit('stream', stream, size)
 
    function write (buf, enc, next) {
      result.length += buf.length
      size = result.length
      next()
    }
 
    function done () {
      if (--pending !== 0) return
      var info = {
        name: opts.name,
        length: result.length,
        pieces: pieces,
        'piece length': size
      }
      outer.emit('info', info, sha1.sync(bencode.encode(info)))
    }
  })
  if (cb) outer.on('info', cb)
  return outer
}
