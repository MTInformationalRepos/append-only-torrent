var through = require('through2')
var defined = require('defined')
var bencode = require('bencode')
var createHash = require('sha.js')
var concat = require('concat-stream')
var sizeStream = require('fixed-size-stream-splitter')

module.exports = function (opts) {
  if (!opts) opts = {}
  if (typeof opts === 'number') opts = { size: opts }
  var pieces = []
  var pieceLength = defined(opts.size, 4096 * 1024)
  var size = 0

  var outer = sizeStream(pieceLength, function (stream) {
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
        'piece length': pieceLength
      }
      var infoBuffer = bencode.encode(info)
      var infoHash = createHash('sha1').update(infoBuffer).digest('hex')
      if (!info.name) info.name = infoHash
      outer.emit('torrent', {
        info: info,
        pieces: pieces,
        infoHash: infoHash,
        infoBuffer: infoBuffer,
        files: [
          { offset: 0, length: size, path: '/tmp/' + infoHash }
        ]
      })
    }
  })
  return outer
}
