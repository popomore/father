'use strict';

var join = require('path').join;
var father = require('..');
var SpmPackage = father.SpmPackage;
var ComponentPackage = father.ComponentPackage;
var base = join(__dirname, 'fixtures');
require('should');

describe('Father', function() {

  it('Spm package', function() {
    var pkg = new SpmPackage(join(base, 'spm'));
    var pkgDeps = pkg.dependencies;
    pkg.main.should.eql('a.js');
    pkg.name.should.eql('a');
    pkg.version.should.eql('1.0.0');
    pkg.files['a.js'].dependencies.should.eql(['b', './b', 'd', './a.json', 'c']);
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

  it('Component package', function() {
    var pkg = new ComponentPackage(join(base, 'component'));
    var pkgDeps = pkg.dependencies;
    pkg.main.should.eql('src/index.js');
    pkg.name.should.eql('test');
    pkg.version.should.eql('1.0.0');
    pkg.files['src/index.js'].dependencies.should.eql(['each', './test', 'to-function']);
    pkg.files['src/test.js'].dependencies.should.eql(['to-function']);
    pkgDeps['each'].should.eql(pkg.get('each'));
    pkgDeps['to-function'].should.eql(pkg.get('to-function'));

    var each = pkg.get('each');
    var eachDeps = each.dependencies;
    each.main.should.eql('index.js');
    each.name.should.eql('each');
    each.version.should.eql('0.2.3');
    each.files['index.js'].dependencies.should.eql(['type', 'to-function']);
    eachDeps['type'].should.eql(pkg.get('type'));
    eachDeps['to-function'].should.eql(pkg.get('to-function'));

    var type = pkg.get('type');
    type.main.should.eql('index.js');
    type.name.should.eql('type');
    type.version.should.eql('1.0.0');
    type.files['index.js'].dependencies.should.eql([]);

    var func = pkg.get('to-function');
    func.main.should.eql('index.js');
    func.name.should.eql('to-function');
    func.version.should.eql('1.0.0');
    func.files['index.js'].dependencies.should.eql([]);
  });

});
