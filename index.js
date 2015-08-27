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
  var size = 5

  var outer = sizeStream(size, function (stream) {
    var h = createHash('sha1')
    stream.pipe(through(write, end))
    outer.emit('stream', stream, size)
 
    function write (buf, enc, next) {
      h.update(buf)
      size += buf.length
      next()
    }
 
    function end () {
      pieces.push(h.digest('hex'))
      var info = {
        name: opts.name,
        length: size,
        pieces: pieces,
        'piece length': size
      }
      var infoHash = createHash('sha1')
        .update(bencode.encode(info))
        .digest('hex')
      outer.emit('torrent', { info: info, infoHash: infoHash })
    }
  })
  return outer
}
