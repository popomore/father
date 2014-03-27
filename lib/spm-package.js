'use strict';

var fs = require('fs');
var path = require('path');
var join = path.join;
var semver = require('semver');
var Package = require('./package');
var debug = require('debug')('father:spm');

var SpmPackage = Package.extend({

  readPackage: function() {
    var pkg = normalize(join(this.dest, 'package.json'));
    debug('pkg info %s', JSON.stringify(pkg));

    Object.keys(pkg.dependencies)
      .forEach(function(name) {
        pkg.dependencies[name] = resolveDeps(name, pkg, this);
      }.bind(this));
    return pkg;
  }

});

module.exports = SpmPackage;

function normalize(pkg) {
  var dest = path.dirname(pkg);
  pkg = require(pkg);
  pkg.spm = pkg.spm || {};
  var ret = {
    id: pkg.name + '@' + pkg.version,
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.spm.dependencies || {},
    main: pkg.main || 'index.js',
    dest: dest,
    output: pkg.spm.output || [],
    origin: pkg
  };
  return ret;
}

var versionCache = {};

function resolveDeps(name, pkg, self) {
  var versions, version = pkg.dependencies[name];
  var ancestor = getAncestor(self);
  var dest = join(ancestor.dest, 'sea-modules', name);

  if (versionCache[dest]) {
    versions = versionCache[dest];
  } else {
    versions = getVersions(dest);
    versionCache[dest] = versions;
  }

  version = semver.maxSatisfying(versions, version);

  return {
    id: name + '@' + version,
    name: name,
    version: version,
    dest: join(dest, version)
  };
}

/*
  Get versions from specified directory
*/

function getVersions(dest) {
  return fs.readdirSync(dest)
    .filter(function(item) {
      return semver.valid(item);
    })
    .sort(function(a, b) {
      return semver.gt(a, b);
    });
}

function getAncestor(self) {
  while(self.father) {
    self = self.father;
  }
  return self;
}
