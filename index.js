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
  var pieceLength = defined(opts.size, 4096 * 1024)
  var size = 0
  var store = opts.store

  var outer = sizeStream(pieceLength, function (stream) {
    var h = createHash('sha1')
    stream.pipe(through(write, end))
    outer.emit('stream', stream, size)
 
    function write (buf, enc, next) {
      h.update(buf)
      var offset = size
      size += buf.length
      store.put(offset, buf, function (err) { next(err) })
    }
 
    function end () {
      var hash = h.digest()
      pieces.push(hash)
      hexpieces.push(hash.toString('hex'))
 
      var info = {
        name: defined(opts.name, 'output'),
        length: size,
        'piece length': pieceLength,
        pieces: Buffer.concat(pieces)
      }
      var infoBuffer = bencode.encode(info)
      var infoHash = createHash('sha1').update(infoBuffer).digest('hex')
      if (!info.name) info.name = infoHash
      var torrent = {
        info: info,
        infoHash: infoHash,
        infoBuffer: infoBuffer,
        files: [
          {
            offset: 0,
            length: size,
            path: '/tmp/' + infoHash 
          }
        ],
        pieces: hexpieces,
        announce: defined(opts.announce, opts.trackers, [])
      }
      outer.emit('torrent', torrent)
    }
  })
  return outer
}
