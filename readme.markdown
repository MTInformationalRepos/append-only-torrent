# append-only-torrent

create a sequence of torrent files for growing input

# example

``` js
var append = require('append-only-torrent')
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
```

output (lines of input begin with `>`):

```
$ bittorrent-tracker -p 9000 &
$ node example/append.js 
> beep
magnet:?xt=urn:btih:24c26a8fad401a58ee2b0342466158efc66cbf93&tr=udp%3A%2F%2F127.0.0.1%3A9000
> boop
magnet:?xt=urn:btih:907aaff57d3768d5ad2aa43d33b7861084f62fa0&tr=udp%3A%2F%2F127.0.0.1%3A9000
> hello world!!!!!!!!!!
magnet:?xt=urn:btih:fd3b51e00ca0d097a5e6a2f98840fa6204a4da8e&tr=udp%3A%2F%2F127.0.0.1%3A9000
magnet:?xt=urn:btih:09663b55eaf6874d5577d63426ac2f0ed8ef4dd1&tr=udp%3A%2F%2F127.0.0.1%3A9000
magnet:?xt=urn:btih:a194ea4aca7b6a0d5e614315bb9a4c1245883317&tr=udp%3A%2F%2F127.0.0.1%3A9000
magnet:?xt=urn:btih:772e931016c0313b5803aa134959917996924aa5&tr=udp%3A%2F%2F127.0.0.1%3A9000
```

# api

``` js
var append = require('append-only-torrent')
```

## var w = append(size, fstore, cb)

Return a writable stream `w` to append data to a sequence of torrent files with
piece length `size`. `fstore` should be an
[abstract-chunk-store](https://npmjs.com/package/abstract-chunk-store)
constructor.

`cb(err, info)` fires with an `info` object of torrent metadata.

# install

```
npm install append-only-torrent
```

# license

MIT
