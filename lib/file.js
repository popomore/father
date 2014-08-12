'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var extname = path.extname;
var debug = require('debug')('father:file');

module.exports = File;

File.cache = {};

File.require = function requireFile(src, pkg) {
  src = tryFile(src, pkg.dest);
  var fullpath = join(pkg.dest, src);
  if (fullpath in File.cache) {
    debug('found %s in File.cache', fullpath);
    return File.cache[fullpath];
  }
  var file = new File(src, pkg);
  debug('save %s in File.cache', file.fullpath);
  return File.cache[file.fullpath] = file;
};

File.ignore = function ignoreFile(name) {
  var pkg = {
    name: name,
    dest: ''
  };
  var file = new File('', pkg);
  file.ignore = true;
  file._dependencies = [];
  return file;
};

function File(filepath, pkg) {
  this.pkg = pkg;
  this.filepath = filepath;
  this.extension = extname(filepath).substring(1);
  this.fullpath = join(pkg.dest, filepath);
  this.extension = extname(filepath).substring(1);
}

File.prototype.lookup = function(cb, extra) {
  var deps = this._run().concat(extra || []);

  return deps.map(function(obj) {
    return cb(obj);
  }).filter(function(item, index, arr) {
    return item && index === arr.indexOf(item);
  });
};

File.prototype.hasExt = function(ext, filter) {
  var deps = this._run();

  return deps.some(function(obj) {
    if (filter && !filter(obj)) return false;
    return obj.extension === ext;
  });
};

File.prototype._run = function() {
  if (this.cache) return this.cache;

  var that = this, cache = [];
  var fileDeps = this._dependencies;
  fileDeps.forEach(function(file) {
    cache.push({
      ignore: file.ignore === true,
      filepath: file.filepath,
      pkg: file.pkg,
      isRelative: that.pkg.name === file.pkg.name,
      dependent: that,
      extension: file.extension
    });

    var deps = file._run();
    cache = cache.concat(deps);
  });

  return this.cache = cache;
};

Object.defineProperty(File.prototype, 'dependencies', {
  get: function() {
    return this._dependencies.map(function(file) {
      if (file.ignore) {
        return file.pkg.name;
      }
      if (this.pkg.name !== file.pkg.name) {
        return file.pkg.name;
      }
      file = path.relative(path.dirname(this.filepath), file.filepath);
      return file.charAt(0) === '.' ? file : './' + file;
    }, this);
  }
});

function tryFile(src, cwd) {
  var fileArray = [src];
  if (!/\.js$/.test(src)) {
    fileArray.push(src + '.js');
  }
  if (!extname(src)) {
    fileArray.push(src + '/index.js');
  }

  for (var i in fileArray) {
    var file = join(cwd, fileArray[i]);
    try {
      var stat = fs.statSync(file);
      if (stat.isFile()) {
        return fileArray[i];
      }
    } catch(e) {}
  }

  debug('%s not found', src);
  throw new Error(join(cwd, src) + ' not found');
}
