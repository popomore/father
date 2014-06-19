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
        pkgFile.dependencies[name] = resolveDeps(name, pkgFile, this);
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

  var deps = pkg.spm.dependencies || {};

  // resolve devDependencies for root package
  if (!father) {
    extend(deps, pkg.spm.devDependencies);
  }

  var ret = {
    id: pkg.name + '@' + pkg.version,
    name: pkg.name,
    version: pkg.version,
    dependencies: deps,
    main: pkg.spm.main,
    dest: dest,
    output: pkg.spm.output,
    origin: pkg
  };
  return ret;
}

function resolveDeps(name, pkgFile, pkg) {
  var base = util.getBase(pkg);
  var dest = join(base, 'sea-modules', name);
  var version = util.getVersion(pkgFile.dependencies[name], dest);
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

function extend(target) {
  var args = [].slice.call(arguments, 1);
  args.forEach(function(obj) {
    for (var i in obj) {
      target[i] = obj[i];
    }
  });
  return target;
}
