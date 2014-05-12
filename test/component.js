'use strict';

var join = require('path').join;
var father = require('..');
var ComponentPackage = father.ComponentPackage;
var base = join(__dirname, 'fixtures');
var should = require('should');

describe('Father.ComponentPackage', function() {

  it('normal', function() {
    var pkg = getPackage('component/normal');
    pkg.output.should.eql(['src/index.js']);
    should.exists(pkg.files['src/index.js']);
    pkg.main.should.eql('src/index.js');
    pkg.name.should.eql('test');
    pkg.version.should.eql('1.0.0');
    pkg.files['src/index.js'].dependencies.should.eql(['each', './test', 'to-function']);
    pkg.files['src/test.js'].dependencies.should.eql(['to-function']);
    var pkgDeps = pkg.dependencies;
    Object.keys(pkgDeps).should.eql(['each', 'to-function']);
    pkgDeps['each'].should.eql(pkg.get('each@0.2.3'));
    pkgDeps['to-function'].should.eql(pkg.get('to-function@1.0.0'));

    var each = pkg.get('each@0.2.3');
    each.main.should.eql('index.js');
    each.name.should.eql('each');
    each.version.should.eql('0.2.3');
    each.files['index.js'].dependencies.should.eql(['type', 'to-function']);
    var eachDeps = each.dependencies;
    Object.keys(eachDeps).should.eql(['to-function', 'type']);
    eachDeps['type'].should.eql(pkg.get('type@1.0.0'));
    eachDeps['to-function'].should.eql(pkg.get('to-function@2.0.0'));

    var type = pkg.get('type@1.0.0');
    type.main.should.eql('index.js');
    type.name.should.eql('type');
    type.version.should.eql('1.0.0');
    type.files['index.js'].dependencies.should.eql([]);
    var typeDeps = type.dependencies;
    Object.keys(typeDeps).should.eql([]);

    var props = pkg.get('props@1.1.2');
    props.main.should.eql('index.js');
    props.name.should.eql('props');
    props.version.should.eql('1.1.2');
    props.files['index.js'].dependencies.should.eql([]);
    var propsDeps = props.dependencies;
    Object.keys(propsDeps).should.eql([]);

    var toFunction = pkg.get('to-function@1.0.0');
    toFunction.main.should.eql('index.js');
    toFunction.name.should.eql('to-function');
    toFunction.version.should.eql('1.0.0');
    toFunction.files['index.js'].dependencies.should.eql([]);
    var toFunctionDeps = toFunction.dependencies;
    Object.keys(toFunctionDeps).should.eql([]);

    var toFunction2 = pkg.get('to-function@2.0.0');
    toFunction2.main.should.eql('index.js');
    toFunction2.name.should.eql('to-function');
    toFunction2.version.should.eql('2.0.0');
    toFunction2.files['index.js'].dependencies.should.eql(['props']);
    var toFunction2Deps = toFunction2.dependencies;
    Object.keys(toFunction2Deps).should.eql(['props']);
    toFunction2Deps['props'].should.eql(pkg.get('props@1.1.2'));
  });

  it('ref version', function() {
    var pkg = getPackage('component/ref-version');
    var pkgDeps = pkg.dependencies;
    Object.keys(pkgDeps).should.eql(['b1', 'c']);

    var b = pkgDeps['b1'];
    b.name.should.eql('b1');
    b.version.should.eql('1.1.0');

    var c = pkgDeps['c'];
    c.name.should.eql('c');
    c.version.should.eql('1.1.0');
  });

  it('no match version', function() {
    (function() {
      getPackage('component/no-match-version')._parse();
    }).should.throw('no matched version of father/b');
  });
});

function getPackage(name) {
  return new ComponentPackage(join(base, name));
}
