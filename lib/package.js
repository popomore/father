'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var dirname = path.dirname;
var extname = path.extname;
var requires = require('requires');
var Class = require('arale').Class;

var Package = Class.create({

  initialize: function(dir, father) {
    if (father) {
      this.father = father;
    } else {
      this.packages = {};
    }

    this.dest = dir;
    this._dependencies = [];
    this.run();
  },

  run: function() {
    var that = this, Self = this.constructor;
    var pkg = this._pkg = this.readPackage();

    this.id = pkg.id;

    Object.keys(pkg.dependencies)
      .forEach(function(name) {
        var sub = pkg.dependencies[name];
        if (!that.get(sub.id)) {
          that.set(new Self(sub.dest, that));
        }
        this._dependencies.push(sub.id);
      }.bind(this));

    var keys = ['name', 'version', 'main', 'origin', 'dependencies'];
    this._exportProperty(keys);

    this.parseFiles();
  },

  parseFiles: function() {
    var dest = this.dest;
    var files = this.files = {};

    lookupFiles.call(this, this._pkg.main);

    function lookupFiles(src) {
      extname(src) || (src = src + '.js');

      if (!files[src]) {
        var req = requires(fs.readFileSync(join(dest, src)))
          .map(function(item) {
            return item.path.replace('.js', '');
          });
        req
          .slice()
          .filter(function(item) {
            return item.charAt(0) === '.';
          })
          .forEach(function(item) {
            item = join(dirname(src), item);
            req = req.concat(lookupFiles(item));
          });

        files[src] = {
          dependencies: req.filter(function(item, index, arr) {
            return index === arr.indexOf(item);
          })
        };
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

    return id === this.id ? this : this.packages[id];
  },

  _exportProperty: function(keys) {
    var that = this;
    keys.forEach(function(key) {
      Object.defineProperty(that, key, {
        set: function() {},
        get: function() {
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
