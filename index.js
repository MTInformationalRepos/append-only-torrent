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
  if (!opts) opts = {}
  var pieceLength = defined(opts.pieceLength, 4096 * 1024)
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
        outer.emit('chunk', chunk, hash)
        var info = {
          name: opts.name,
          length: size,
          pieces: pieces,
          'piece length': pieceLength
        }
        outer.emit('info', info, sha1.sync(bencode.encode(info)))
        next()
      })
    })
  ))
  return outer
}
