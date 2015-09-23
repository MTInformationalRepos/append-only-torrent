var append = require('../')
var torrent = require('torrent-stream')
var magnet = require('magnet-uri')

var Store = require('fd-chunk-store')
function fstore (size) { return Store(size, './file') }

var trackers = [ 'udp://127.0.0.1:9000' ]

process.stdin.pipe(append(5, fstore, function (err, t) {
  var engine = torrent(t, {
    storage: fstore,
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
}))
