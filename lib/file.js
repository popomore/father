'use strict';

var path = require('path');
var join = path.join;
var dirname = path.dirname;
var isRelative = require('./util').isRelative;

module.exports = File;

function File(filepath, pkg) {
  this.filepath = filepath;
  this.pkg = pkg;
}

File.prototype.lookup = function(cb) {
  var deps = [];
  var fileDeps = this.dependencies;
  var pkg = this.pkg;
  var filepath = this.filepath;

  fileDeps.forEach(function(file) {
    if (isRelative(file)) {
      file = resolvePath(file, filepath);
      deps.push(cb(file, pkg, true));
    } else {
      var pkg_ = pkg.dependencies[file];
      deps.push(cb(pkg_.main, pkg_));

      file = pkg_.files[pkg_.main];
      deps = deps.concat(file.lookup(cb));
    }
  });

  return deps.filter(function(item, index, arr) {
    return item && index === arr.indexOf(item);
  });
};

function resolvePath(relative, base) {
  return join(dirname(base), relative);
}
