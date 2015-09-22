var fs = require('fs')
var inherits = require('inherits')
var EventEmitter = require('events').EventEmitter
var Writable = require('readable-stream/writable')
var duplexify = require('duplexify')

module.exports = FS
inherits(FS, EventEmitter)

function FS (size, opts) {
  if (!(this instanceof FS)) return new FS(size, opts)
  var self = this
  self.size = size
  if (typeof opts === 'string') opts = { path: opts }
  EventEmitter.call(self)
  self.path = opts.path
  fs.open(opts.path, 'r+', function onopen (err, fd) {
    if (err && err.code === 'ENOENT') {
      return fs.open(opts.path, 'w+', onopen)
    }
    fs.fstat(fd, function (err, stat) {
      if (stat.size % self.size === 0) ready(fd, stat, null)
      else remainder(fd, stat)
    })
  })

  function remainder (fd, stat) {
    var rem = stat.size % self.size
    var buf = new Buffer(rem)
    fs.read(fd, buf, 0, buf.length, stat.size - rem, onread)
    function onread (err, bytesRead) {
      ready(fd, stat, buf)
    }
  }

  function ready (fd, stat, rem) {
    self.filesize = stat.size
    self.fd = fd
    self.emit('open', stat.size, rem)
  }
}

function ready (f) {
  return function () {
    var self = this
    var args = arguments
    if (self.fd) f.apply(self, args)
    else self.once('open', function () { f.apply(self, args) })
  }
}

FS.prototype.createWriteStream = function (opts) {
  var self = this
  if (!opts) opts = {}
  var offset = opts.start || 0
  if (!self.fd) {
    var dup = duplexify()
    self.once('open', function () {
      dup.setWritable(self.createWriteStream(opts))
    })
    return dup
  }
  var w = new Writable
  w._write = function (buf, enc, next) {
    fs.write(self.fd, buf, 0, buf.length, offset, next)
    offset += buf.length
  }
  return w
}

FS.prototype.get = function (n, opts, cb) {
  this.getBytes(n * this.size, (n + 1) * this.size, opts, cb)
}

FS.prototype.getBytes = ready(function (i, j, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!cb) cb = noop
  var self = this
  var buf = new Buffer(j - i)
  var total = 0
  fs.read(self.fd, buf, 0, buf.length, i, onread)
 
  function onread (err, bytesRead) {
    if (err) return cb(err)
    total += bytesRead
    if (total < buf.length && bytesRead > 0) {
      fs.read(self.fd, buf, total, j - i - total, i + total, onread)
    } else if (bytesRead === 0) {
      cb(null, buf.slice(0, total))
    } else cb(null, buf)
  }
})

FS.prototype.put = function (n, buf, opts, cb) {
  this.putBytes(this.size * n, buf, opts, cb)
}

FS.prototype.putBytes = ready(function (pos, buf, opts, cb) {
  if (typeof opts === 'function') {
    cb = opts
    opts = {}
  }
  if (!cb) cb = noop
  fs.write(this.fd, buf, 0, buf.length, pos, cb)
})

function noop () {}
