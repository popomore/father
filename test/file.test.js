'use strict';

var join = require('path').join;
var father = require('..');
var SpmPackage = father.SpmPackage;
var base = join(__dirname, 'fixtures/spm');
var should = require('should');

describe('Father.File', function() {
  var pkg = getPackage('normal');

  it('lookup all deps', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg = fileInfo.pkg;
      return [pkg.name, pkg.version, fileInfo.path].join('/');
    });
    ret.should.eql([
      'b/1.1.0/src/b.js',
      'c/1.1.1/index.js',
      'd/0.1.0/index.js',
      'b/1.1.0/src/b.tpl',
      'a/1.0.0/b.js',
      'd/0.1.1/index.js',
      'a/1.0.0/a.json',
      'a/1.0.0/a.handlebars'
    ]);
  });

  it('lookup relative deps', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg_ = fileInfo.pkg;
      return pkg.name === pkg_.name ?
        [pkg_.name, pkg_.version, fileInfo.path].join('/') :
        [pkg_.name, pkg_.version, pkg_.main].join('/');
    });
    ret.should.eql([
      'b/1.1.0/src/b.js',
      'c/1.1.1/index.js',
      'd/0.1.0/index.js',
      'a/1.0.0/b.js',
      'd/0.1.1/index.js',
      'a/1.0.0/a.json',
      'a/1.0.0/a.handlebars'
    ]);
  });

  it('lookup relative file', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      if (fileInfo.isRelative) return false;
      var pkg = fileInfo.pkg;
      return [pkg.name, pkg.version, fileInfo.path].join('/');
    });
    ret.should.eql([
      'b/1.1.0/src/b.js',
      'c/1.1.1/index.js',
      'd/0.1.0/index.js',
      'd/0.1.1/index.js'
    ]);
  });

  it('file dependent', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg = fileInfo.pkg, dependent = fileInfo.dependent;
      return [dependent.pkg.name, dependent.pkg.version, dependent.path].join('/') +
        ' -> ' +
        [pkg.name, pkg.version, fileInfo.path].join('/');
    });
    ret.should.eql([
      'a/1.0.0/a.js -> b/1.1.0/src/b.js',
      'b/1.1.0/src/b.js -> c/1.1.1/index.js',
      'c/1.1.1/index.js -> d/0.1.0/index.js',
      'b/1.1.0/src/b.js -> b/1.1.0/src/b.tpl',
      'a/1.0.0/a.js -> a/1.0.0/b.js',
      'a/1.0.0/b.js -> b/1.1.0/src/b.js',
      'a/1.0.0/b.js -> c/1.1.1/index.js',
      'a/1.0.0/a.js -> d/0.1.1/index.js',
      'a/1.0.0/a.js -> a/1.0.0/a.json',
      'a/1.0.0/a.js -> a/1.0.0/a.handlebars'
    ]);
  });

  it('lookup filter', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg = fileInfo.pkg;
      switch(pkg.name) {
        case 'b':
          return;
        case 'c':
          return null;
        case 'd':
          return '';
        default:
          return [pkg.name, pkg.version, fileInfo.path].join('/');
      }
    });
    ret.should.eql([
      'a/1.0.0/b.js',
      'a/1.0.0/a.json',
      'a/1.0.0/a.handlebars'
    ]);
  });

  it('lookup file fullpath', function() {
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg = fileInfo.pkg;
      if (pkg.name === 'a') {
        return fileInfo.fullpath;
      }
    });
    ret.should.eql([
      'b.js',
      'a.json',
      'a.handlebars'
    ].map(function(item) {
      return join(pkg.dest, item);
    }));
  });

  it('lookup extra', function() {
    var extra = [{
      path: 'index.js',
      pkg: {
        name: 'extra',
        version: '1.0.0'
      }
    }];
    var ret = pkg.files['a.js'].lookup(function(fileInfo) {
      var pkg = fileInfo.pkg;
      return [pkg.name, pkg.version, fileInfo.path].join('/');
    }, extra);
    ret.should.eql([
      'b/1.1.0/src/b.js',
      'c/1.1.1/index.js',
      'd/0.1.0/index.js',
      'b/1.1.0/src/b.tpl',
      'a/1.0.0/b.js',
      'd/0.1.1/index.js',
      'a/1.0.0/a.json',
      'a/1.0.0/a.handlebars',
      'extra/1.0.0/index.js'
    ]);
  });

  it('file hasExt', function() {
    var file = pkg.files['a.js'];

    file.hasExt('js').should.be.true;
    file.hasExt('tpl').should.be.true;
    file.hasExt('json').should.be.true;
    file.hasExt('handlebars').should.be.true;
    file.hasExt('css').should.be.false;
  });

  it('file add exist deps', function() {
    var file = pkg.files['a.js'];
    should.exist(file._dependencies['./b.js']);
    file.addDeps('./b.js', null);
    should.exist(file._dependencies['./b.js']);
  });

  it('file getDeps', function() {
    var file = pkg.files['a.js'];
    var fileB = file.getDeps('b');
    fileB.pkg.name.should.eql('b');
    fileB.path.should.eql('src/b.js');
  });

  it('file hasExt filter', function() {
    var file = pkg.files['a.js'];

    file.hasExt('js', filter).should.be.false;

    function filter (fileInfo) {
      return fileInfo.extension !== 'js';
    }
  });

  it('ignore package', function() {
    var pkg = getPackage('normal', {ignore: ['b']});
    pkg.files['b.js'].lookup(function(fileInfo) {
      return fileInfo.ignore ? fileInfo.pkg.id : false;
    }).should.eql(['b@1.1.0', 'c@1.1.1', 'd@0.1.0']);
  });

  it('ignore package when no dependencies', function() {
    var pkg = getPackage('no-installed-package', {ignore: ['b']});
    pkg.files['index.js'].lookup(function(fileInfo) {
      return fileInfo.ignore ? fileInfo.pkg.name : false;
    }).should.eql(['b']);
  });

});

function getPackage(name, options) {
  return new SpmPackage(join(base, name), options);
}
