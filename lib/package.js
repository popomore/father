'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var relative = path.relative;
var glob = require('glob');
var requires = require('searequire');
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

var properties = [
  'name',
  'version',
  'main',
  'origin',
  'dependencies',
  'devDependencies',
  'files',
  'output'
];

var Package = Class.create({

  Implements: [Events],

  initialize: function(dir, options) {
    if (!dir) throw new Error('miss the first argument');
    options = extend({}, defaults, options);
    this.father = options.father;
    this.options = options;
    this.dest = dir;
    this._packages = {};
    this._dependencies = [];
    this._devDependencies = [];
    this._exportProperty(properties);
    this.fileCache = this.father ? this.father.fileCache : {};
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
    return this.fileCache[path] || null;
  },

  getFiles: function() {
    return this.fileCache;
  },

  _exportProperty: function(keys) {
    var that = this;
    keys.forEach(function(key) {
      var prop = {
        get: function() {
          if (key === 'dependencies' || key === 'devDependencies') {
            var deps = {};
            that['_' + key].forEach(function(id) {
              var pkg = that.getPackage(id);
              deps[pkg.name] = pkg;
            });
            return deps;
          } else {
            return that._pkg[key];
          }
        },
        set: function(obj) {
          if (key === 'dependencies' || key === 'devDependencies') {
            var deps = that['_' + key];
            Object.keys(obj).forEach(function(key) {
              var pkg_ = obj[key];
              if (deps.indexOf(key) === -1 && key === pkg_.name) {
                deps.push(pkg_.id);
              }
            });
          }
        },
        enumerable: true
      };

      Object.defineProperty(that, key, prop);
    });
  },

  _parse: function() {
    // start
    debug('*start parse %s', this.dest);
    this._pkg = this.readPackage();
    this._pkg.files = {};
    this.id = this._pkg.id;

    // parsing
    this._parsePkgDeps();
    this._parseFiles();

    // end
    debug('* end  parse %s', this.dest);
    return this;
  },

  _parsePkgDeps: function() {
    var Self = this.constructor;
    var that = this;

    resolveDeps(this._pkg.dependencies);
    resolveDeps(this._pkg.devDependencies || {}, true);

    function resolveDeps(deps, isDev) {
      Object.keys(deps)
        .forEach(function(name) {
          var sub = deps[name];
          if (!that.getPackage(sub.id)) {
            var opt = extend({}, that.options, {father: that});
            that.setPackage(new Self(sub.dest, opt));
          }
          if (isDev) {
            that._devDependencies.push(sub.id);
          } else {
            that._dependencies.push(sub.id);
          }
        });
    }

    debug('_parsePkgDeps of pkg(%s) [%s] [%s]', this.id,
      Object.keys(this._pkg.dependencies),
      Object.keys(this._pkg.devDependencies || {}));
  },

  _parseFiles: function() {
    var options = this.options;

    getEntry(this, options).forEach(function(src) {
      lookupFiles(src, this);
    }, this);

    debug('_parseFiles [%s] of pkg(%s)', Object.keys(this._pkg.files));

    function lookupFiles(src, pkg) {
      var files = pkg._pkg.files;
      var file = requireFile(src, pkg);
      var relativePath = relative(process.cwd(), join(file.pkg.dest, file.relative));
      src = winPath(file.relative);

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
      getFileDeps(file.path, file.extension, options)
      .filter(function(name) {
        // skip file or package
        // TODO: should skip a when name is a/b.js
        return options.skip.indexOf(name) === -1;
      })
      .map(function(name) {
        var depFile;

        // ignore files
        if (options.ignore.indexOf(name) !== -1) {
          debug('ignore id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
          return file.addDeps(name, File.ignore(name, pkg));
        }

        // packages of dependency
        if (!isRelative(name)) {
          debug('transport package id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
          var finfo = getFileInfo(name, pkg);
          depFile = requireFile(finfo.path, finfo.pkg);
          if (!depFile.pkg.files[depFile.path]) {
            debug('%s is not in files of package(%s)', depFile.path, depFile.pkg.id);
            lookupFiles(finfo.path, finfo.pkg);
          }
          return file.addDeps(name, depFile);
        }

        // relative
        debug('transport relative id(%s) of basepath(%s) of package(%s)', name, relativePath, pkg.id);
        var path = resolvePath(name, src);
        depFile = requireFile(path, pkg);
        lookupFiles(path, pkg);
        file.addDeps(name, depFile);
      });

      files[src]._done = true;

      debug('lookupFiles file %s of pkg(%s), deps [%s]', pkg.id, src, files[src].dependencies);

      function requireFile(path, pkg) {
        try {
          return File.require(path, pkg);
        } catch(e) {
          e.message += ' that required by ' + relativePath;
          throw e;
        }
      }

      function getFileInfo(filepath, pkg) {
        var m = filepath.match(/^([a-z0-9-_.]+)(?:\/(.+))*$/i);
        if (!m) {
          throw new Error('unknown name ' + filepath + ' required by ' + relativePath);
        }
        pkg = pkg.dependencies[m[1]];
        if (!pkg) {
          throw new Error(m[1] + ' is not in dependencies but required by ' + relativePath);
        }
        var path = m[2] || pkg.main;
        debug('get fileInfo %s / %s', pkg.name, path);
        return {
          path: path,
          pkg: pkg
        };
      }
    }
  },

  /*
    Method below can be overridden
  */

  readPackage: noop

});

module.exports = Package;


function getFileDeps(fullpath, ext) {
  var code = fs.readFileSync(fullpath).toString();
  switch(ext) {
    case 'js':
      return requires(code, false).map(transform);
    case 'css':
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
  pkg = pkg._pkg;

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

/* istanbul ignore next */
function noop() {}
