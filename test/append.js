var test = require('tape')
var append = require('../')
var torrent = require('torrent-stream')
var magnet = require('magnet-uri')
var concat = require('concat-stream')
var mkdirp = require('mkdirp')
var parseTorrent = require('parse-torrent')

var Store = require('fd-chunk-store')
var file = '/tmp/append-only-torrent-' + Math.random()
var dir = '/tmp/append-only-torrent-dir-' + Math.random()
function fstore (size) { return Store(size, file) }

var Tracker = require('bittorrent-tracker/server')
var server, trackers = [], engines = []

test('tracker setup', function (t) {
  t.plan(2)
  mkdirp(dir, function (err) {
    t.ifError(err)
  })
  server = new Tracker
  server.listen(0, function () {
    trackers.push('udp://127.0.0.1:' + server.port)
    t.ok(server.port)
  })
})

test('append', function (t) {
  t.plan(9)
  var expected = [
    Buffer('BEEP '),
    Buffer('BEEP BOOP!'),
    Buffer('BEEP BOOP!\nWHAT')
  ]
  var w = append(5, fstore, function (err, info) {
    var engine = torrent(info, {
      storage: fstore,
      trackers: trackers
    })
    engine.on('ready', function () {
      var ok = engine.torrent.pieces.every(function (piece, i) {
        return engine.bitfield.get(i)
      })
      t.ok(ok, 'data ok')
      var link = magnet.encode({
        xt: 'urn:btih:' + info.infoHash,
        tr: trackers
      })
      setTimeout(function () {
        download(link, function (err, body) {
          t.ifError(err)
          t.deepEqual(body, expected.shift())
        })
      }, 5000)
    })
    engine.listen(0)
    engines.push(engine)
  })
  w.write('BEEP BOOP!\n')
  w.write('WHATEVER')
})

test('teardown', function (t) {
  server.close()
  engines.forEach(function (e) { e.destroy() })
  t.end()
})

function download (link, cb) {
  var e = torrent(link, { path: dir, trackers: trackers })
  e.on('ready', function () {
    e.files[0].createReadStream().pipe(concat(function (body) {
      cb(null, body)
    }))
  })
  engines.push(e)
}
