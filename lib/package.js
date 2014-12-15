'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var relative = path.relative;
var extname = path.extname;
var glob = require('glob');
var requires = require('crequire');
var imports = require('css-imports');
var Class = require('arale').Class;
var Events = require('arale').Events;
var debug = require('debug')('father:package');
var util = require('./util');
var winPath = util.winPath;
var isRelative = util.isRelative;
var resolvePath = util.resolvePath;
var File = require('./file');

var defaults = {
  // another entry point for parse
  entry: [],

  // skip file or package when parseFiles, and won't exist in deps
  skip: [],

  // skip file or package when parseFiles, but will exist in deps
  ignore: []
};

var Package = Class.create({

  Implements: [Events],

  initialize: function(dir, options) {
    if (!dir) throw new Error('miss the first argument');
    options = extend({}, defaults, options);
    this.options = options;
    this.father = options.father;
    this.dest = dir;
    // cache all packages
    this._packages = {};
    // cache all files
    this._files = this.father ? this.father._files : {};
    this._parse();
  },

  setPackage: function(pkg) {
    if (this.father) {
      return this.father.setPackage(pkg);
    }
    if (!this._packages[pkg.id]) {
      this._packages[pkg.id] = pkg;
    }
  },

  getPackage: function(id) {
    if (this.father) {
      return this.father.getPackage(id);
    }
    return id === this.id ? this : this._packages[id];
  },

  getPackages: function() {
    if (this.father) {
      return this.father.getPackages();
    }
    return this._packages;
  },

  getFile: function(path) {
    return this._files[path] || null;
  },

  getFiles: function() {
    return this._files;
  },

  _parse: function() {
    // start
    debug('* start parse %s', this.dest);
    var properties = [
      'id',
      'name',
      'version',
      'main',
      'origin',
      'dependencies',
      'devDependencies',
      'engines',
      'output'
    ];
    var pkg = this.readPackage();
    copyProp(pkg, this, properties);

    // parsing
    this._parsePkgDeps();
    this._parseFiles();

    // end
    debug('* end  parse %s', this.dest);
    return this;
  },

  _parsePkgDeps: function() {
    resolveDeps(this, 'dependencies');
    resolveDeps(this, 'devDependencies');
    resolveDeps(this, 'engines');

    debug('_parsePkgDeps of pkg(%s) [%s] [%s] [%s]', this.id,
      this._dependencies, this._devDependencies, this._engines);
  },

  _parseFiles: function() {
    this.files = {};

    getEntry(this, this.options).forEach(function(src) {
      var file = requireFile(src, this);
      lookupDeps(file, this.options);
    }, this);

    debug('_parseFiles [%s] of pkg(%s)', Object.keys(this.files), this.id);
  },

  /*
    Method below can be overridden
  */

  readPackage: noop

});

module.exports = Package;

function lookupDeps(file, options) {
  var relativePath = relative(process.cwd(), file.path);
  var src = winPath(file.relative);
  var pkg = file.pkg;
  var files = pkg.files;

  // parsing or parsed
  if (files[src]) {
    if (!files[src]._done) {
      throw new Error('found ' + relativePath + ' has recursive dependency');
    }
    // file has been parsed when `_done` is true,
    return;
  }

  files[src] = file;

  // file dependencies
  getFileDeps(file.path)
  .forEach(function(name) {
    var depFile;

    // skip file or package, don't resolve it
    // TODO: should skip a when name is a/b.js
    if (options.skip.indexOf(name) !== -1) return;

    // ignore files, file won't be parsed, but will be added to dependencies
    if (options.ignore.indexOf(name.split('/')[0]) !== -1) {
      debug('ignore id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
      return file.addDeps(name, File.ignore(name));
    }

    // packages of dependency
    if (!isRelative(name)) {
      debug('transport package id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
      depFile = getDepFile(name, pkg, relativePath);
      if (!depFile.pkg.files[depFile.relative]) {
        debug('%s is not in files of package(%s)', depFile.relative, depFile.pkg.id);
        lookupDeps(depFile, options);
      }
      return file.addDeps(name, depFile);
    }

    // relative
    debug('transport relative id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
    depFile = requireFile(resolvePath(name, src), pkg, relativePath);
    lookupDeps(depFile, options);
    file.addDeps(name, depFile);
  });

  files[src]._done = true;

  debug('lookupDeps file %s of pkg(%s), deps [%s]', pkg.id, src, files[src].dependencies);
}

function requireFile(filepath, pkg, relativePath) {
  try {
    return File.require(filepath, pkg);
  } catch(e) {
    if (relativePath) {
      e.message += ' that required by ' + relativePath;
    }
    throw e;
  }
}

function getDepFile(filepath, pkg, relativePath) {
  var message, m = filepath.match(/^([a-z0-9-_.]+)(?:\/(.+))*$/i);
  if (!m) {
    message = 'unknown name ' + filepath;
    if (relativePath) message += ' required by ' + relativePath;
    throw new Error(message);
  }
  pkg = pkg.dependencies[m[1]];
  if (!pkg) {
    message = m[1] + ' is not in dependencies';
    if (relativePath) message += ' but required by '  + relativePath;
    throw new Error(message);
  }
  var depFile = requireFile(m[2] || pkg.main, pkg, relativePath);
  debug('get fileInfo %s / %s', depFile.pkg.name, depFile.path);
  return depFile;
}

function getFileDeps(fullpath) {
  var code = fs.readFileSync(fullpath).toString();
  var ext = extname(fullpath);
  switch(ext) {
    case '.js':
      return requires(code, false).map(transform);
    case '.css':
      return imports(code).map(transform);
    default:
      return [];
  }

  function transform(item) {
    return item.path;
  }
}

// entry point of package
function getEntry(pkg, options) {
  var isFather = !pkg.father;
  var entry = [];

  // base on pkg.main
  if (fs.existsSync(join(pkg.dest, pkg.main))) {
    entry.push(pkg.main);
  }

  // base on options.entry when father package
  if (isFather) {
    entry = entry.concat(getEntryWithGlob(options.entry));
  }

  // base on pkg.output
  var output = getEntryWithGlob(pkg.output);
  pkg.output = output;
  entry = entry.concat(output);

  entry = entry.filter(function(item, index, arr) {
    return index === arr.indexOf(item);
  });

  debug('get entry %s', entry.join(', '));
  return entry;

  function getEntryWithGlob(entry) {
    if (!(Array.isArray(entry) && entry.length)) return [];

    var ret = [];
    entry.forEach(function(outputGlob) {
      // glob support
      var items = glob.sync(outputGlob, {cwd:pkg.dest});

      // handle ./index.js
      items = items.map(function(item) {
        return item.replace(/^\.\//, '');
      });

      ret = ret.concat(items);
    });

    return ret.filter(function(item, index, arr) {
      return index === arr.indexOf(item);
    });
  }
}

function extend(target) {
  var args = [].slice.call(arguments, 1);
  args.forEach(function(obj) {
    for (var i in obj) {
      target[i] = obj[i];
    }
  });
  return target;
}

function resolveDeps(pkg, prop) {
  var Package = pkg.constructor;
  var privateDeps = pkg['_' + prop] = [];
  var deps = pkg[prop] || {};
  Object.keys(deps).forEach(function(name) {
    var sub = deps[name];
    if (!pkg.getPackage(sub.id)) {
      var opt = extend({}, pkg.options, {father: pkg});
      pkg.setPackage(new Package(sub.dest, opt));
    }
    privateDeps.push(sub.id);
  });

  delete pkg[prop];
  Object.defineProperty(pkg, prop, {
    get: function() {
      var ret = {};
      privateDeps.forEach(function(id) {
        var pkg_ = pkg.getPackage(id);
        ret[pkg_.name] = pkg_;
      });
      return ret;
    },
    set: function(pkgs) {
      Object.keys(pkgs).forEach(function(key) {
        var pkg_ = pkgs[key];
        if (privateDeps.indexOf(key) === -1 && key === pkg_.name) {
          privateDeps.push(pkg_.id);
        }
      });
    },
    enumerable: true
  });
}

function copyProp(src, target, props) {
  props.forEach(function(key) {
    target[key] = src[key];
  });
}

/* istanbul ignore next */
function noop() {}
