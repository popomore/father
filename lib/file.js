'use strict';

var path = require('path');
var join = path.join;
var dirname = path.dirname;
var extname = path.extname;
var isRelative = require('./util').isRelative;

module.exports = File;

function File(filepath, pkg) {
  this.filepath = filepath;
  this.pkg = pkg;
  this.extension = extname(filepath).substring(1);
}

File.prototype.lookup = function(cb) {
  var deps = this._run();

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
  var fileDeps = this.dependencies;
  var pkg = this.pkg;
  var basepath = this.filepath;

  var filepath, pkg_, file;
  fileDeps.forEach(function(id) {
    if (isRelative(id)) {
      pkg_ = pkg;
      filepath = resolvePath(id, basepath);
    } else {
      pkg_ = pkg.dependencies[id];
      filepath = pkg_.main;
    }

    cache.push({
      filepath: filepath,
      pkg: pkg_,
      isRelative: isRelative(id),
      dependent: that,
      extension: extname(filepath).substring(1)
    });

    file = pkg_.files[filepath];
    var deps = file._run();
    cache = cache.concat(deps);
  });

  return this.cache = cache;
};

function resolvePath(relative, base) {
  return join(dirname(base), relative);
}
