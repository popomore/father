'use strict';

var fs = require('fs');
var path = require('path');
var extend = require('extend');
var join = path.join;
var relative = path.relative;
var extname = path.extname;
var debug = require('debug')('father:file');

module.exports = File;

File.require = function requireFile(src, pkg) {
  var cache = pkg.fileCache;
  src = tryFile(src, pkg.dest);
  var fullpath = join(pkg.dest, src);
  if (fullpath in cache) {
    debug('found %s in cache', fullpath);
    return cache[fullpath];
  }
  var file = new File(src, pkg);
  debug('save %s in cache', file.fullpath);
  return cache[file.fullpath] = file;
};

File.ignore = function ignoreFile(name, pkg) {
  var file, pkg_ = pkg.dependencies[name];
  if (pkg_) {
    file =  File.require(pkg_.main, pkg_);
  } else {
    pkg = {
      id: name,
      name: name,
      dest: ''
    };
    file = new File('', pkg);
  }
  file.ignore = true;
  return file;
};

function File(filepath, pkg) {
  this.pkg = pkg;
  this.path = filepath;
  this.extension = extname(filepath).substring(1);
  this.fullpath = join(pkg.dest, filepath);
  this._dependencies = {};
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

File.prototype.addDeps = function(id, file) {
  if (!(id in this._dependencies)) {
    this._dependencies[id] = file;
  }
};

File.prototype.getDeps = function(id) {
  return this._dependencies[id];
};

File.prototype._run = function() {
  if (this.cache) return this.cache;

  var that = this, cache = [];
  Object.keys(this._dependencies).forEach(function(key) {
    var file = this._dependencies[key];
    var isIgnore = file.ignore === true;
    cache.push({
      ignore: isIgnore,
      pkg: file.pkg,
      path: file.path,
      fullpath: file.fullpath,
      isRelative: that.pkg.name === file.pkg.name,
      dependent: that,
      extension: file.extension
    });

    var deps = file._run().map(function(file) {
      if (isIgnore) {
        file = extend({}, file);
        file.ignore = true;
      }
      return file;
    });
    cache = cache.concat(deps);
  }, this);

  return this.cache = cache;
};

Object.defineProperty(File.prototype, 'dependencies', {
  get: function() {
    return Object.keys(this._dependencies).map(function(key) {
      var file = this._dependencies[key];
      if (file.ignore) {
        return file.pkg.name;
      }
      if (this.pkg.name !== file.pkg.name) {
        return file.pkg.name + (file.pkg.main !== file.path ? '/' + file.path : '');
      }
      file = path.relative(path.dirname(this.path), file.path);
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
    fileArray.push(src + '.json');
    fileArray.push(join(src, 'index.js'));
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

  src = relative(process.cwd(), join(cwd, src));
  debug('%s not found', src);
  throw new Error(src + ' not found');
}
