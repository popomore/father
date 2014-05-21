'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var dirname = path.dirname;
var extname = path.extname;
var relative = path.relative;
var requires = require('requires');
var imports = require('css-imports');
var Class = require('arale').Class;
var Events = require('arale').Events;
var debug = require('debug')('father:package');
var util = require('./util');

var defaults = {
  // config an extension as key, when that extension is found,
  // value will be added to deps
  extraDeps: {},

  // another entry point for parse
  entry: [],

  // ignore file or package when parseFiles
  ignore: []
};

var properties = [
  'name',
  'version',
  'main',
  'origin',
  'dependencies',
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
          if (key === 'dependencies') {
            var deps = {};
            that._dependencies.forEach(function(id) {
              var pkg = that.get(id);
              deps[pkg.name] = pkg;
            });
            return deps;
          } else {
            return that._pkg[key];
          }
        },
        configurable: true
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
    var Self = this.constructor, deps = this._pkg.dependencies;
    Object.keys(deps)
      .forEach(function(name) {
        var sub = deps[name];
        if (!this.get(sub.id)) {
          var opt = extend({}, this.options, {father: this});
          this.set(new Self(sub.dest, opt)._parse());
        }
        this._dependencies.push(sub.id);
      }.bind(this));
    debug('_parsePkgDeps of pkg(%s) [%s]', this.id, Object.keys(deps));
  },

  _parseFiles: function() {
    var dest = this.dest, options = this.options;
    var pkg = this._pkg, files = pkg.files = {};
    var extraVal = getExtraVal(options.extraDeps);

    getEntry(this, options).forEach(lookupFiles);

    function lookupFiles(src, entry) {
      var deps = [];
      src = testFile(src, dest);
      var ext = extname(src).substring(1);
      src = util.winPath(src);

      // parsing or parsed
      if (files[src]) {
        if (!files[src].dependencies) {
          throw new Error('found ' + src + ' has recursive dependency');
        }
        // dependencies exist if file has been parsed,
        return files[src].dependencies;
      } else {
        files[src] = {};
      }

      // extension in extraDeps will be added to deps
      // E.g. a.handlebars should require `handlebars`
      var extraDeps = options.extraDeps;
      if (extraDeps[ext]) deps.push(extraDeps[ext]);

      // file dependencies
      var data = fs.readFileSync(join(dest, src)).toString();
      deps = deps.concat(getFileDeps(data, ext, options));

      // conbime with the dependencies of the dependent file
      var fileDeps = deps;
      deps = [];
      fileDeps.forEach(function(name) {
        deps.push(name);

        // ignore extraDeps, E.g. hanldebars
        if (~extraVal.indexOf(name)) {
          return deps.push(name);
        }

        // dependent packages
        if (!util.isRelative(name)) {
          var pkg_ = pkg.dependencies[name];
          if (!~options.ignore.indexOf(name) && !pkg_) {
            throw new Error(name + ' not found but required');
          }
          return deps.push(name);
        }

        // relative files
        name = util.resolvePath(name, src);
        var deps_ = lookupFiles(name, src)
          .map(function(it) {
            if (!util.isRelative(it)) return it;
            it = util.resolvePath(it, name);
            it = relative(dirname(src), it);
            return util.isRelative(it) ? it : './' + it;
          });
        deps = deps.concat(deps_);
      });

      // unique
      deps = deps.filter(function(item, index, arr) {
        return index === arr.indexOf(item);
      }).map(function(item) {
        return util.winPath(item);
      });

      files[src].dependencies = deps;

      debug('_parseFiles of pkg(%s): file %s, deps [%s]', pkg.id, src, deps);

      // css which is required by js don't return deps
      return extname(entry) === '.js' && ext === 'css' ? [] : deps;
    }
  },

  /*
    Method below can be overridden
  */

  readPackage: function() {}

});

module.exports = Package;


function getFileDeps(code, ext) {
  switch(ext) {
    case 'js':
      return requires(code).map(transform);
    case 'css':
      return imports(code).map(transform);
    default:
      return [];
  }

  function transform(item) {
    return item.path.replace(/\.js$/, '');
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

  // only father package will concat option.entry and pkg.output
  if (isFather) {
    // base on options.entry
    if (Array.isArray(options.entry) && options.entry.length) {
      entry = entry.concat(options.entry);
    }

    // base on pkg.output
    if (Array.isArray(pkg.output) && pkg.output.length) {
      entry = entry.concat(pkg.output);
    }
  }

  return entry
    .filter(function(item, index, arr) {
      return index === arr.indexOf(item);
    });
}

function getExtraVal(extraDeps) {
  return Object.keys(extraDeps)
    .map(function(key) {
      return extraDeps[key];
    });
}

function testFile(src, cwd) {
  src = /\.js$/.test(src) ? src : src + '.js';
  if (fs.existsSync(join(cwd, src))) {
    return src;
  }
  if (fs.existsSync(join(cwd, src.replace(/\.js$/, '')))) {
    return src.replace(/\.js$/, '');
  }
  debug('%s not found', src);
  throw new Error(src + ' not found');
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
