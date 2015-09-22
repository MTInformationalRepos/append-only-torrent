var append = require('../')
var torrent = require('torrent-stream')
var magnet = require('magnet-uri')

var fs = require('fs')
var FDStore = require('../store.js')
var store = FDStore(5, { path: './file' })
var trackers = [ 'udp://127.0.0.1:9000' ]

fs.stat('file', function (err, stat) {
  var w = append({ size: 5, offset: (stat || {}).size })
  w.on('stream', function (stream, offset, done) {
    var w = stream.pipe(store.createWriteStream({ start: offset }))
    w.once('finish', done)
  })
  w.on('torrent', ontorrent)
  process.stdin.pipe(w)
})

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
