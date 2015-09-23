var append = require('../')
var torrent = require('torrent-stream')
var magnet = require('magnet-uri')
var through = require('through2')
var createHash = require('sha.js')

var fs = require('fs')
var FDStore = require('fs-remainder-chunk-store')
var store = FDStore(5, { path: './file' })
var trackers = [ 'udp://127.0.0.1:9000' ]

store.once('open', function (offset, rem) {
  var pieces = []
  var r = store.createReadStream()
  r.pipe(through(write, end))

  function write (buf, enc, next) {
    if (buf.length === 5) {
      var hash = createHash('sha1').update(buf).digest()
      pieces.push(hash)
    }
    next()
  }

  function end () {
    var w = append({
      size: 5,
      offset: offset,
      remainder: rem,
      pieces: pieces
    })
    w.on('torrent', ontorrent)
    w.on('stream', onstream)
    process.stdin.pipe(w)
  }
})

function onstream (stream, offset, done) {
  var w = stream.pipe(store.createWriteStream({ start: offset }))
  w.once('finish', done)
}

function ontorrent (t, done) {
  var engine = torrent(t, {
    storage: function () { return store },
    trackers: trackers
  })
  engine.on('ready', function () {
    var ok = engine.torrent.pieces.every(function (piece, i) {
      return engine.bitfield.get(i)
    })
    if (!ok) console.error('missing data')
    else console.log(magnet.encode({
      xt: 'urn:btih:' + t.infoHash,
      tr: trackers
    }))
    done()
  })
  engine.listen(0)
}
