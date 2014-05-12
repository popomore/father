'use strict';

var fs = require('fs');
var semver = require('semver');

exports.getVersion = function getVersion(version, dest) {
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
};

exports.getBase = function getBase(pkg) {
  while(pkg.father) {
    pkg = pkg.father;
  }
  return pkg.dest;
};
