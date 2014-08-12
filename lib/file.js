'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var dirname = path.dirname;
var extname = path.extname;
var util = require('./util');
var isRelative = util.isRelative;
var winPath = util.winPath;
var debug = require('debug')('father:file');

module.exports = File;

File.cache = {};
File.require = function requireFile(src, pkg) {
  src = tryFile(src, pkg.dest);
  var file = new File(src, pkg);
  return File.cache[file.fullpath] = file;
};
File.ignore = function requireFile(name) {
  return {
    ignore: true,
    pkg: {name: name}
  };
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
      if (!pkg_) {
        return cache.push({
          ignore: true,
          pkg: {name: id},
          isRelative: false
        });
      }
      filepath = pkg_.main;
    }

    cache.push({
      ignore: false,
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

function resolvePath(relative, base) {
  return winPath(join(dirname(base), relative));
}

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
