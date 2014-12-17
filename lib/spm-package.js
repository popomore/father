'use strict';

var path = require('path');
var join = path.join;
var util = require('./util');
var Package = require('./package');
var mixarg = require('mixarg');
var debug = require('debug')('father:spm');

var SpmPackage = Package.extend({

  readPackage: function() {
    if (!this.options.moduleDir) this.options.moduleDir = 'spm_modules';

    var pkgFile = normalize(join(this.dest, 'package.json'));
    debug('readPackage(%s) info %s', pkgFile.id, JSON.stringify(pkgFile));

    parseDeps(pkgFile, 'dependencies', this);

    // Only use the devDependencies of father package
    if (!this.father) {
      parseDeps(pkgFile, 'devDependencies', this);
      parseDeps(pkgFile, 'engines', this);
    } else {
      pkgFile.devDependencies = {};
      pkgFile.engines = {};
    }

    return pkgFile;
  }

});

module.exports = SpmPackage;

function normalize(pkg) {
  var dest = path.dirname(pkg);
  delete require.cache[require.resolve(pkg)];
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

  var buildArgs = mixarg(pkg.spm.buildArgs);
  if (buildArgs.ignore) buildArgs.ignore = buildArgs.ignore.split(',');
  if (buildArgs.skip) buildArgs.skip = buildArgs.skip.split(',');
  pkg.spm.buildArgs = buildArgs;

  var ret = {
    id: pkg.name + '@' + pkg.version,
    name: pkg.name,
    version: pkg.version,
    dependencies: pkg.spm.dependencies || {},
    devDependencies: pkg.spm.devDependencies || {},
    engines: pkg.spm.engines || {},
    main: pkg.spm.main,
    dest: dest,
    output: pkg.spm.output,
    origin: pkg
  };

  return ret;
}

function parseDeps(pkgFile, prop, pkg) {
  var deps = pkgFile[prop];
  Object.keys(deps)
  .forEach(function(name) {
    deps[name] =  resolveDeps(name, deps, pkg);
  });
}

function resolveDeps(name, deps, pkg) {
  var base = util.getBase(pkg);
  var dest = join(base, pkg.options.moduleDir, name);
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
