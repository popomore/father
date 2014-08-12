'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
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
  },

  set: function(pkg) {
    if (this.father) {
      return this.father.set(pkg);
    }
    if (!this._packages[pkg.id]) {
      this._packages[pkg.id] = pkg;
    }
  },

  get: function(id) {
    if (this.father) {
      return this.father.get(id);
    }
    if (!this._parsed && !this._parsing) this._parse();
    return id === this.id ? this : this._packages[id];
  },

  getPackages: function() {
    if (this.father) {
      return this.father.getPackages();
    }
    if (!this._parsed && !this._parsing) this._parse();
    return this._packages;
  },

  _exportProperty: function(keys) {
    var that = this;
    keys.forEach(function(key) {
      var prop = {
        get: function() {
          if (!that._parsed && !that._parsing) that._parse();
          if (key === 'dependencies' || key === 'devDependencies') {
            var deps = {};
            that['_' + key].forEach(function(id) {
              var pkg = that.get(id);
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
    this._parsing = true;
    this._pkg = this.readPackage();
    this.id = this._pkg.id;

    // parsing
    this._parsePkgDeps();
    this._parseFiles();

    // end
    this._parsed = true;
    this._parsing = false;
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
          if (!that.get(sub.id)) {
            var opt = extend({}, that.options, {father: that});
            that.set(new Self(sub.dest, opt)._parse());
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
    var pkg = this._pkg, files = pkg.files = {};
    var that = this;

    getEntry(this, options).forEach(lookupFiles);

    function lookupFiles(src) {
      var file = File.require(src, that);
      src = winPath(file.filepath);

      // parsing or parsed
      if (files[src]) {
        if (!files[src]._dependencies) {
          throw new Error('found ' + src + ' has recursive dependency');
        }
        // dependencies exist if file has been parsed,
        return files[src]._dependencies;
      } else {
        files[src] = file;
      }

      // file dependencies
      var deps = getFileDeps(file.fullpath, file.extension, options)
      .filter(function(item) {
        // skip file or package
        return options.skip.indexOf(item) === -1;
      })
      .map(function(name) {
        // packages of dependency
        if (!isRelative(name)) {
          if (options.ignore.indexOf(name) !== -1) {
            return File.ignore(name);
          }
          var pkg_ = that.dependencies[name];
          if (!pkg_) {
            throw new Error(name + ' not found but required');
          }
          return File.require(pkg_.main, pkg_);
        }

        // relative
        var path = resolvePath(name, src);
        var file = File.require(path, that);
        lookupFiles(path);
        return file;
      });

      files[src]._dependencies = deps;

      debug('_parseFiles of pkg(%s): file %s, deps [%s]', pkg.id, src, deps);
      return deps;
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
      return requires(code, true).filter(filterAsync).map(transform);
    case 'css':
      return imports(code).map(transform);
    default:
      return [];
  }

  function transform(item) {
    return item.path;
  }

  // don't support require.xx expect for require.async
  function filterAsync(item) {
    return !(item.flag && item.flag !== '.async');
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

  return entry.filter(function(item, index, arr) {
    return index === arr.indexOf(item);
  });

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
