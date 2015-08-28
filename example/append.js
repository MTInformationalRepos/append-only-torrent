var append = require('../')
var torrent = require('torrent-stream')
var magnet = require('magnet-uri')

var FStore = require('fs-chunk-store')
var store = FStore(5, { path: '/tmp/append.store' })
var trackers = [ 'udp://127.0.0.1:9000' ]

var w = append({ size: 5, store: store })
w.on('torrent', function (t) {
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
  })
  engine.listen(0)
})
process.stdin.pipe(w)
