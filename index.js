var Writable = require('readable-stream/writable')
var BlockStream = require('block-stream2')
var sha1 = require('simple-sha1')
var combine = require('stream-combiner2')
var writeonly = require('write-only-stream')
var through = require('through2')
var defined = require('defined')
var bencode = require('bencode')
var announceList = require('./announce.js')

module.exports = function (opts) {
  var pieceLength = defined(opts.pieceLength, 4096 * 1024)
  var put = opts.put
  if (!put) throw new Error('opts.put not provided')
  var pieces = []
  var announce = defined(opts.announceList, opts.trackers, announceList)
    .map(function (x) { return Array.isArray(x) ? x : [x] })
  var size = 0

  var outer = writeonly(combine(
    new BlockStream(pieceLength, { zeroPadding: false }),
    through.obj(function (chunk, enc, next) {
      size += chunk.length
      sha1(chunk, function (hash) {
        pieces.push(hash)
        put(hash, chunk, function (err) {
          if (err) return next(err)
          outer.emit('pieces', pieces)
          outer.emit('torrent', createTorrent(pieces))
          next()
        })
      })
    })
  ))
  return outer

  function createTorrent (pieces) {
    return bencode.encode({
      info: {
        name: opts.name,
        length: size,
        pieces: pieces
      },
      announce: announce[0][0],
      'announce-list': announce,
      'creation date': defined(Number(opts.creationDate), Date.now()),
      encoding: 'UTF-8',
      'piece length': pieceLength,
    })
  }
}
