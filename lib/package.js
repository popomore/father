'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var dirname = path.dirname;
var extname = path.extname;
var requires = require('requires');
var Class = require('arale').Class;
var Events = require('arale').Events;
var debug = require('debug')('father:package');

// config an extension as key, when that extension is found, value will be added to deps
var extraDeps = {
  handlebars: 'handlebars'
};

var Package = Class.create({

  Implements: [Events],

  initialize: function(dir, father) {
    if (father) {
      this.father = father;
    } else {
      this.packages = {};
    }

    this.dest = dir;
    this._dependencies = [];

    var keys = ['name', 'version', 'main', 'origin', 'dependencies', 'files'];
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
          this.set(new Self(sub.dest, this)._parse());
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

    lookupFiles(pkg.main);

    function lookupFiles(src) {
      extname(src) || (src = src + '.js');

      if (!files[src]) {
        var data;
        try {
          data = fs.readFileSync(join(dest, src));
        } catch(e) {
          that.trigger('notfound', src);
          return [];
        }

        var req = requires(data)
          .reduce(function(previous, current) {
            var path = current.path;
            previous.push(path.replace(/\.js$/, ''));

            // extension in extraDeps will be added to deps
            var ext = extname(path).substring(1);
            if (extraDeps[ext]) {
              previous.push(extraDeps[ext]);
            }
            return previous;
          }, []);

        req
          .slice()
          .filter(function(item) {
            return item.charAt(0) === '.';
          })
          .forEach(function(item) {
            item = join(dirname(src), item);
            req = req.concat(lookupFiles(item));
          });

        var deps = req.filter(function(item, index, arr) {
          return index === arr.indexOf(item);
        });

        files[src] = {
          dependencies: deps
        };

        debug('pkg(%s) file %s, deps %s', pkg.id, src, deps);
      }
      return req || [];
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
