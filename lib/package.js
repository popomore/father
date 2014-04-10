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


var Package = Class.create({

  Implements: [Events],

  initialize: function(dir, options) {
    this.options = options || {};

    if (this.options.father) {
      this.father = this.options.father;
    } else {
      this.packages = {};
    }

    // config an extension as key, when that extension is found, value will be added to deps
    this.options.extraDeps = this.options.extraDeps || {};
    this.options.output = this.options.output || [];
    this.dest = dir;
    this._dependencies = [];

    var keys = ['name', 'version', 'main', 'origin', 'dependencies', 'files', 'output'];
    this._exportProperty(keys);
  },

  _parse: function() {
    debug('start parse %s', this.dest);
    this._running = true;

    var Self = this.constructor;
    var pkg = this._pkg = this.readPackage();

    debug('pkg(%s) id %s', pkg.id, pkg.id);
    this.id = pkg.id;

    Object.keys(pkg.dependencies)
      .forEach(function(name) {
        var sub = pkg.dependencies[name];
        if (!this.get(sub.id)) {
          var opt = extend({}, this.options, {father: this});
          this.set(new Self(sub.dest, opt)._parse());
        }
        this._dependencies.push(sub.id);
      }.bind(this));
    debug('pkg(%s) dependencies [%s]', this.id, Object.keys(pkg.dependencies));

    this._parseFiles();

    debug('end parse %s', this.dest);
    this._parsed = true;
    this._running = false;
    return this;
  },

  _parseFiles: function() {
    var that = this, dest = this.dest;
    var pkg = this._pkg, files = pkg.files = {};

    // base on pkg.main
    lookupFiles(pkg.main);

    // base on pkg.output
    var output = this.options.output;
    if (Array.isArray(pkg.output)) {
      output = output.concat(pkg.output)
        .filter(function(item, index, arr) {
          return index === arr.indexOf(item);
        });
    }
    output.forEach(lookupFiles);

    function lookupFiles(src) {
      var ext = extname(src).substring(1);
      if (!ext) {
        src = src + '.js';
        ext = 'js';
      }

      if (files[src]) {
        return files[src].dependencies;
      }

      try {
        var data = fs.readFileSync(join(dest, src));
      } catch(e) {
        that.trigger('notfound', src);
        return [];
      }

      // file dependencies
      var deps = getFileDeps(data, ext, that.options.extraDeps);
      debug('file %s, deps %s', src, deps);

      // conbime with the dependencies of the dependent file
      deps = deps.reduce(function(previous, current) {
        previous.push(current);

        if (current.charAt(0) !== '.') {
          return previous;
        }

        current = join(dirname(src), current);
        var deps_ = lookupFiles(current)
          .map(function(it) {
            if (it.charAt(0) !== '.') return it;
            it = join(dirname(current), it);
            it = relative(dirname(src), it);
            return it.charAt(0) === '.' ? it : './' + it;
          });
        previous = previous.concat(deps_);
        return previous;
      }, []);

      // unique
      deps = deps.filter(function(item, index, arr) {
        return index === arr.indexOf(item);
      });

      files[src] = {
        dependencies: deps
      };

      debug('pkg(%s) file %s, deps %s', pkg.id, src, deps);

      return ext === 'css' ? [] : deps;
    }
  },

  set: function(pkg) {
    if (this.father) {
      return this.father.set(pkg);
    }

    if (!this.packages[pkg.id]) {
      this.packages[pkg.id] = pkg;
    }
  },

  get: function(id) {
    if (this.father) {
      return this.father.get(id);
    }

    if (!this._parsed && !this._running) this._parse();
    return id === this.id ? this : this.packages[id];
  },

  _exportProperty: function(keys) {
    var that = this;
    keys.forEach(function(key) {
      Object.defineProperty(that, key, {
        get: function() {
          if (!that._parsed && !that._running) that._parse();
          if (key === 'dependencies') {
            var deps = {};
            that._dependencies.forEach(function(id) {
              var pkg = that.get(id);
              deps[pkg.name] = pkg;
            });
            return deps;
          } else {
            var pkg = that.get(that.id);
            return pkg ? pkg._pkg[key] : '';
          }
        },
        configurable: true
      });
    });
  },

  /*
    Method below can be overridden
  */

  readPackage: function() {}

});

module.exports = Package;


function getFileDeps(code, ext, extraDeps) {
  switch(ext) {
    case 'js':
      return requires(code).map(transform);
    case 'css':
      return imports(code).map(transform);
    default:
      // extension in extraDeps will be added to deps
      // E.g. a.handlebars should require `handlebars`
      return extraDeps[ext] ? [extraDeps[ext]] : [];
  }

  function transform(item) {
    return item.path.replace(/\.js$/, '');
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
