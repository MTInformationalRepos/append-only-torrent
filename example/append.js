var append = require('../')
var torrent = require('torrent-stream')

var FStore = require('fs-chunk-store')
var store = FStore(5, { path: '/tmp/append.store' })

var w = append({ size: 5, store: store })
w.on('torrent', function (t) {
  var engine = torrent(t, { store: store })
  engine.on('ready', function () {
    var ok = engine.torrent.pieces.every(function (piece, i) {
      return engine.bitfield.get(i)
    })
    if (!ok) console.error('missing data')
    else console.log('magnet:?xt=urn:btih:' + infoHash.toString('hex'))
  })
  engine.listen(0)
})
process.stdin.pipe(w)
