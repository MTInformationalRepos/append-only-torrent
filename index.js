var through = require('through2')
var defined = require('defined')
var bencode = require('bencode')
var createHash = require('sha.js')
var concat = require('concat-stream')
var sizeStream = require('fixed-size-stream-splitter')

module.exports = function (opts) {
  if (!opts) opts = {}
  if (typeof opts === 'number') opts = { size: opts }
  var pieces = [], hexpieces = []
  var pieceLength = defined(opts.size, 1024 * 64)
  var size = 0
  var offset = defined(opts.offset, 0)
  var streams = []

  var outer = sizeStream(pieceLength, function (stream) {
    streams.push(stream)
    if (streams.length === 1) nextStream()
  })
  function nextStream () {
    if (streams.length === 0) return
    var stream = streams.shift()
    var pending = 2
    var h = createHash('sha1')
    stream.pipe(through(write, done))
    outer.emit('stream', stream, offset, done)
    offset += pieceLength
    var sizes = []
 
    function write (buf, enc, next) {
      h.update(buf)
      size += buf.length
      sizes.push(size)
      next()
    }
 
    function done () {
      if (--pending !== 0) return
      var hash = h.digest()
      pieces.push(hash)
      hexpieces.push(hash.toString('hex'))
      var tsize = sizes.shift()
 
      var info = {
        name: defined(opts.name, 'output'),
        length: tsize,
        'piece length': pieceLength,
        pieces: Buffer.concat(pieces)
      }
      var infoBuffer = bencode.encode(info)
      var infoHash = createHash('sha1').update(infoBuffer).digest('hex')
      var torrent = {
        info: info,
        infoHash: infoHash,
        infoBuffer: infoBuffer,
        files: [
          {
            offset: 0,
            length: tsize,
            path: '/fake/' + infoHash
          }
        ],
        pieces: hexpieces.slice(),
        announce: defined(opts.announce, opts.trackers, [])
      }
      outer.emit('torrent', torrent, nextStream)
    }
  }
  return outer
}
