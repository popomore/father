'use strict';

var path = require('path');
var join = path.join;
var Package = require('./package');

var ComponentPackage = Package.extend({

  readPackage: function() {
    var pkg = normalize(join(this.dest, 'component.json'));
    Object.keys(pkg.dependencies)
      .forEach(function(name) {
        pkg.dependencies[name] = resolveDeps(name, this);
      }.bind(this));
    return pkg;
  }

});

module.exports = ComponentPackage;

function normalize(pkg) {
  var dest = path.dirname(pkg);
  pkg = require(pkg);
  var ret = {
    id: pkg.name,
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.dependencies || {},
    main: pkg.main || 'index.js',
    dest: dest,
    origin: pkg
  };
  return ret;
}

function resolveDeps(name, self) {
  var ancestor = getAncestor(self);
  var dest = join(ancestor.dest, 'components', name.replace('/', '-'));
  var pkg = require(join(dest, 'component.json'));

  return {
    id: pkg.name,
    name: pkg.name,
    version: pkg.version,
    dest: dest
  };
}

function getAncestor(self) {
  while(self.father) {
    self = self.father;
  }
  return self;
}
