'use strict';

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
    this.exportProperty(keys);
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

  exportProperty: function(keys) {
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
