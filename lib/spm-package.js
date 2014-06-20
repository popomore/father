'use strict';

var path = require('path');
var join = path.join;
var util = require('./util');
var Package = require('./package');
var debug = require('debug')('father:spm');

var SpmPackage = Package.extend({

  readPackage: function() {
    var pkgFile = normalize(join(this.dest, 'package.json'), this.father);
    debug('readPackage(%s) info %s', pkgFile.id, JSON.stringify(pkgFile));

    Object.keys(pkgFile.dependencies)
      .forEach(function(name) {
        pkgFile.dependencies[name] = resolveDeps(name, pkgFile.dependencies, this);
      }.bind(this));

    Object.keys(pkgFile.devDependencies)
      .forEach(function(name) {
        pkgFile.devDependencies[name] = resolveDeps(name, pkgFile.devDependencies, this);
      }.bind(this));

    return pkgFile;
  }

});

module.exports = SpmPackage;

function normalize(pkg, father) {
  var dest = path.dirname(pkg);
  delete require.cache[pkg];
  pkg = require(pkg);
  pkg.spm = pkg.spm || {};

  // detect main type
  if (!pkg.spm.main) {
    pkg.spm.main = 'index.js';
  }
  if (typeof pkg.spm.main !== 'string') {
    throw new Error('pkg.spm.main should be string.');
  }
  
  // handle ./index.js
  pkg.spm.main = pkg.spm.main.replace(/^\.\//, '');

  // handle index
  if (path.extname(pkg.spm.main) === '') {
    pkg.spm.main += '.js';
  }

  // detect output type
  if (!pkg.spm.output) {
    pkg.spm.output = [];
  }
  if (!Array.isArray(pkg.spm.output)) {
    throw new Error('pkg.spm.output should be array.');
  }

  var ret = {
    id: pkg.name + '@' + pkg.version,
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.spm.dependencies || {},
    devDependencies: father ? {} : (pkg.spm.devDependencies || {}),
    main: pkg.spm.main,
    dest: dest,
    output: pkg.spm.output,
    origin: pkg
  };

  return ret;
}

function resolveDeps(name, deps, pkg) {
  var base = util.getBase(pkg);
  var dest = join(base, 'sea-modules', name);
  var version = util.getVersion(deps[name], dest);
  if (!version) {
    throw new Error('no matched version of ' + name);
  }
  return {
    id: name + '@' + version,
    name: name,
    version: version,
    dest: join(dest, version)
  };
}
