'use strict';

var fs = require('fs');
var semver = require('semver');
var path = require('path');
var join = path.join;
var dirname = path.dirname;
var debug = require('debug')('father:util');

exports.getVersion = getVersion;
exports.getBase = getBase;
exports.resolvePath = resolvePath;
exports.isRelative = isRelative;
exports.winPath = winPath;

function getVersion(version, dest) {
  var dirs = fs.readdirSync(dest);
  var versions = dirs
    .filter(semver.valid)
    .sort(semver.rcompare);
  var ret = semver.maxSatisfying(versions, version);
  if (ret) return ret;

  // match reference for component
  // tag, branch, hash
  dirs.some(function(ver) {
    if (!semver.valid(ver) && ver === version) {
      ret = ver;
      return true;
    }
  });
  return ret;
}

function getBase(pkg) {
  while(pkg.father) {
    pkg = pkg.father;
  }
  return pkg.dest;
}

/*
  resolve a `relative` path base on `base` path
*/

function resolvePath(relative, base) {
  if (!isRelative(relative) || !base) return relative;
  debug('transport relative id(%s) of basepath(%s)', relative, base);
  relative = join(dirname(base), relative);
  if (isRelative(relative)) throw new Error(winPath(relative) + ' is out of bound');
  return relative;
}

/*
  Test filepath is relative path or not
*/

function isRelative(filepath) {
  return filepath.charAt(0) === '.';
}

function winPath(path) {
  return path.replace(/\\/g, '/');
}
