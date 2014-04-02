'use strict';

var join = require('path').join;
var father = require('..');
var ComponentPackage = father.ComponentPackage;
var base = join(__dirname, 'fixtures');
var should = require('should');

describe('Father.ComponentPackage', function() {

  it('normal', function() {
    var pkg = getPackage('component');
    var pkgDeps = pkg.dependencies;
    pkg.output.should.eql(['src/index.js']);
    should.exists(pkg.files['src/index.js']);
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

function getPackage(name) {
  return new ComponentPackage(join(base, name));
}