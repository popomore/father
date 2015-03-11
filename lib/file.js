'use strict';

var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var exists = require('exists-case').sync;
var winPath = require('./util').winPath;
var join = path.join;
var relative = path.relative;
var extname = path.extname;
var delegate = require('delegates');
var debug = require('debug')('father:file');

File.require = requireFile;
File.ignore = ignoreFile;
File.extend = extendFile;

module.exports = File;

function File(file) {
  if (!file || !file.pkg || !file.path) throw new Error('file.path and file.pkg should exist');
  this.pkg = file.pkg;
  this.base = file.pkg.dest;
  this.path = file.path;
  this.stat = fs.lstatSync(file.path);
  this.contents = fs.readFileSync(file.path);
  this.extension = extname(file.path).substring(1);
  this._dependencies = {};
}

File.prototype = {
  lookup: function(cb, extra) {
    var deps = this._run().concat(extra || []);

    return deps.map(function(obj) {
      return cb(obj);
    }).filter(function(item, index, arr) {
      return item && index === arr.indexOf(item);
    });
  },

  hasExt: function(ext, filter) {
    var deps = this._run();

    return deps.some(function(obj) {
      if (filter && !filter(obj)) return false;
      return obj.extension === ext;
    });
  },

  addDeps: function(id, file) {
    if (!(id in this._dependencies)) {
      this._dependencies[id] = file;
    }
  },

  getDeps: function(id) {
    return this._dependencies[id];
  },

  _run: function() {
    if (this.cache) return this.cache;

    var cache = [];
    Object.keys(this._dependencies).forEach(function(key) {
      var file = this._dependencies[key];
      if (file.ignore) {
        cache.push(createIgnore(file.pkg));
      } else {
        var obj = extendFile(file);
        obj.isRelative = this.pkg.name === file.pkg.name;
        obj.dependent = this;
        cache.push(obj);
        cache = cache.concat(file._run());
      }
    }, this);

    return this.cache = cache;
  },

  get relative() {
    return winPath(relative(this.base, this.path));
  },

  get dependencies() {
    return Object.keys(this._dependencies).map(function(key) {
      var file = this._dependencies[key];
      if (file.ignore) {
        return file.pkg.name;
      }
      if (this.pkg.name !== file.pkg.name) {
        return file.pkg.name + (file.pkg.main !== file.relative ? '/' + file.relative : '');
      }
      file = winPath(relative(path.dirname(this.relative), file.relative));
      return file.charAt(0) === '.' ? file : './' + file;
    }, this);
  },

  get hash() {
    if (this._hash) return this._hash;
    var depStr = this.lookup(function(file) {
      if (file.ignore) return false;
      return file.contents.toString();
    }).join('');
    var content = this.contents.toString() + depStr;
    var hash = this._hash = md5(content);
    debug('generate hash %s of %s, contents: `%s`', hash, this.path, content.replace(/\n/g, '\\n'), this.path);
    return hash;
  }
};

File.prototype.constructor = File;

function requireFile(src, pkg) {
  var cache = pkg._files;
  src = tryFile(src, pkg.dest);
  var fullpath = join(pkg.dest, src);
  if (fullpath in cache) {
    debug('found %s in cache', fullpath);
    return cache[fullpath];
  }
  var file = new File({
    path: join(pkg.dest, src),
    pkg: pkg
  });
  debug('save %s in cache', file.path);
  return cache[file.path] = file;
}

function ignoreFile(name) {
  return createIgnore({
    id: name,
    name: name
  });
}

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
      if (exists(file) && fs.statSync(file).isFile()) {
        return fileArray[i];
      }
    } catch(e) {}
  }

  src = relative(process.cwd(), join(cwd, src));
  debug('%s not found', winPath(src));
  throw new Error(winPath(src) + ' not found');
}

function md5(str) {
  return crypto
  .createHash('md5')
  .update(str, 'utf8')
  .digest('hex')
  .slice(0, 8);
}

/*
  Create a file object extended specified file object that
  won't be affected by the former
*/

function extendFile(file) {
  var obj = {
    file: file
  };
  delegate(obj, 'file')
  .method('lookup')
  .method('hasExt')
  .method('addDeps')
  .method('getDeps')
  .getter('pkg')
  .getter('base')
  .getter('path')
  .getter('contents')
  .getter('relative')
  .getter('extension')
  .getter('stat')
  .getter('dependencies')
  .getter('hash');
  obj.ignore = false;
  return obj;
}

/*
  Create a ignored file object
*/

function createIgnore(pkg) {
  return {
    ignore: true,
    pkg: pkg
  };
}
