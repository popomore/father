'use strict';

var join = require('path').join;
var father = require('..');
var SpmPackage = father.SpmPackage;
var base = join(__dirname, 'fixtures/spm');
var should = require('should');

describe('Father.SpmPackage', function() {

  it('normal', function() {
    var pkg = getPackage('normal', {extraDeps: {handlebars: 'handlebars'}});
    pkg.output.should.eql(['c.js']);
    should.exists(pkg.files['c.js']);
    var pkgDeps = pkg.dependencies;
    pkg.main.should.eql('a.js');
    pkg.name.should.eql('a');
    pkg.version.should.eql('1.0.0');
    pkg.files['a.js'].dependencies.should.eql(['b', './b', 'c', 'd', './a.json', './a.handlebars', 'handlebars']);
    pkg.files['b.js'].dependencies.should.eql(['b', 'c']);
    pkgDeps['b'].should.eql(pkg.get('b@1.1.0'));
    pkgDeps['c'].should.eql(pkg.get('c@1.1.1'));
    pkgDeps['d'].should.eql(pkg.get('d@0.1.1'));

    var b = pkg.get('b@1.1.0');
    var bDeps = b.dependencies;
    b.main.should.eql('src/b.js');
    b.name.should.eql('b');
    b.version.should.eql('1.1.0');
    b.files['src/b.js'].dependencies.should.eql(['c', './b.tpl']);
    bDeps['c'].should.eql(pkg.get('c@1.1.1'));
    bDeps['d'].should.eql(pkg.get('d@0.1.0'));

    var c = pkg.get('c@1.1.1');
    c.main.should.eql('index.js');
    c.name.should.eql('c');
    c.version.should.eql('1.1.1');
    c.files['index.js'].dependencies.should.eql(['d']);

    var d1 = pkg.get('d@0.1.0');
    d1.main.should.eql('index.js');
    d1.name.should.eql('d');
    d1.version.should.eql('0.1.0');
    d1.files['index.js'].dependencies.should.eql([]);

    var d2 = pkg.get('d@0.1.1');
    d2.main.should.eql('index.js');
    d2.name.should.eql('d');
    d2.version.should.eql('0.1.1');
    d2.files['index.js'].dependencies.should.eql([]);
  });

  it('not found', function() {
    var pkg = getPackage('not-found');
    pkg.on('notfound', function(src) {
      src.should.eql('b.js');
    });
    pkg.dependencies.should.eql({});
  });

  it('version cache', function() {
    var pkg = getPackage('version-cache');
    var b = pkg.dependencies['b'];
    b.version.should.eql('0.0.1');
  });

  it('output', function() {
    var pkg = getPackage('output');
    pkg.output.should.eql(['a.js', 'b.js']);
    Object.keys(pkg.files).should.eql(['a1.js', 'a.js', 'b1.js', 'b.js']);
  });

  it('resolve deps', function() {
    var pkg = getPackage('resolve-deps');
    pkg.files['src/c.js'].dependencies.should.eql(['../a', '../b', './d']);
    pkg.files['src/d.js'].dependencies.should.eql([]);
    pkg.files['a.js'].dependencies.should.eql(['./b', './src/d']);
    pkg.files['b.js'].dependencies.should.eql([]);
  });

  it('css', function() {
    var pkg = getPackage('css');
    Object.keys(pkg.files).should.eql(['base.css', 'index.css']);
    pkg.files['index.css'].dependencies.should.eql(['./base.css']);
    pkg.files['base.css'].dependencies.should.eql([]);
  });

  it('css-deps', function() {
    var pkg = getPackage('css-deps');
    Object.keys(pkg.files).should.eql(['index.css']);
    pkg.files['index.css'].dependencies.should.eql(['b']);

    var bPkg = pkg.dependencies.b;
    bPkg.files['src/b.css'].dependencies.should.eql(['./c.css']);
    bPkg.files['src/c.css'].dependencies.should.eql([]);
  });

  it('pass extraDeps', function() {
    var pkg = getPackage('pass-extradeps', {extraDeps: {handlebars: 'handlebars'}});
    var bPkg = pkg.dependencies.b;
    bPkg.files['index.js'].dependencies.should.eql(['./b.handlebars', 'handlebars']);
  });

  it('js require css', function() {
    var pkg = getPackage('js-require-css');
    pkg.files['index.js'].dependencies.should.eql(['./a.css']);
    pkg.files['a.css'].dependencies.should.eql(['./b.css']);
    pkg.files['b.css'].dependencies.should.eql([]);
  });

  it('extra output', function() {
    var pkg = getPackage('extra-output', {output: ['a.js']});
    should.exists(pkg.files['a.js']);
  });

});

function getPackage(name, options) {
  return new SpmPackage(join(base, name), options);
}
