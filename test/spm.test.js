'use strict';

var join = require('path').join;
var father = require('..');
var SpmPackage = father.SpmPackage;
var base = join(__dirname, 'fixtures/spm');
var should = require('should');

describe('Father.SpmPackage', function() {

  it('normal', function() {
    var pkg = getPackage('normal');
    pkg.output.should.eql(['c.js']);
    should.exists(pkg.files['c.js']);
    var pkgDeps = pkg.dependencies;
    var pkgDevDeps = pkg.devDependencies;
    pkg.main.should.eql('a.js');
    pkg.name.should.eql('a');
    pkg.version.should.eql('1.0.0');
    pkg.files['a.js'].dependencies.should.eql(['b', './b.js', 'd', './a.json', './a.handlebars']);
    pkg.files['b.js'].dependencies.should.eql(['b', 'c']);
    pkgDeps['b'].should.eql(pkg.get('b@1.1.0'));
    pkgDeps['c'].should.eql(pkg.get('c@1.1.1'));
    pkgDeps['d'].should.eql(pkg.get('d@0.1.1'));
    pkgDevDeps['e'].should.eql(pkg.get('e@1.1.0'));

    var b = pkg.get('b@1.1.0');
    b.fileCache.should.equal(pkg.fileCache);
    var bDeps = b.dependencies;
    b.main.should.eql('src/b.js');
    b.name.should.eql('b');
    b.version.should.eql('1.1.0');
    b.files['src/b.js'].dependencies.should.eql(['c', './b.tpl']);
    bDeps['c'].should.eql(pkg.get('c@1.1.1'));
    bDeps['d'].should.eql(pkg.get('d@0.1.0'));

    var c = pkg.get('c@1.1.1');
    c.fileCache.should.equal(pkg.fileCache);
    c.main.should.eql('index.js');
    c.name.should.eql('c');
    c.version.should.eql('1.1.1');
    c.files['index.js'].dependencies.should.eql(['d']);

    var d1 = pkg.get('d@0.1.0');
    d1.fileCache.should.equal(pkg.fileCache);
    d1.main.should.eql('index.js');
    d1.name.should.eql('d');
    d1.version.should.eql('0.1.0');
    d1.files['index.js'].dependencies.should.eql([]);

    var d2 = pkg.get('d@0.1.1');
    d2.fileCache.should.equal(pkg.fileCache);
    d2.main.should.eql('index.js');
    d2.name.should.eql('d');
    d2.version.should.eql('0.1.1');
    d2.files['index.js'].dependencies.should.eql([]);

    var e = pkg.get('e@1.1.0');
    e.fileCache.should.equal(pkg.fileCache);
    e.main.should.eql('src/e.js');
    e.name.should.eql('e');
    e.version.should.eql('1.1.0');
    Object.keys(e.dependencies).should.eql([]);
    e.files['src/e.js'].dependencies.should.eql([]);
  });

  it('version cache', function() {
    var pkg = getPackage('version-cache');
    var b = pkg.dependencies['b'];
    b.version.should.eql('0.0.1');
  });

  it('output', function() {
    var pkg = getPackage('output');
    pkg.output.should.eql(['a.js', 'b.js', 'glob/c.js']);
    Object.keys(pkg.files).should.eql(['index.js','a.js', 'a1.js', 'b.js', 'b1.js', 'glob/c.js', 'c1.js']);
  });

  it('output glob duplicate', function() {
    var pkg = getPackage('output-glob-duplicate');
    pkg.output.should.eql(['a.js']);
    Object.keys(pkg.files).should.eql(['a.js']);
  });

  it('other entry', function() {
    var pkg = getPackage('other-entry', {entry: ['a.js']});
    Object.keys(pkg.files).should.eql(['index.js', 'a.js', 'b.js']);

    var pkgB = pkg.get('b@1.0.0');
    Object.keys(pkgB.files).should.eql(['index.js', 'a.js']);
  });

  it('other entry with glob', function() {
    var pkg = getPackage('other-entry', {entry: ['./glob/*.js']});
    Object.keys(pkg.files).should.eql(['index.js', 'glob/c.js', 'b.js']);

    var pkgB = pkg.get('b@1.0.0');
    Object.keys(pkgB.files).should.eql(['index.js', 'a.js']);
  });

  it('resolve deps', function() {
    var pkg = getPackage('resolve-deps');
    pkg.files['src/c.js'].dependencies.should.eql(['../a.js']);
    pkg.files['src/d.js'].dependencies.should.eql([]);
    pkg.files['a.js'].dependencies.should.eql(['./b.js', './src/d.js']);
    pkg.files['b.js'].dependencies.should.eql([]);
  });

  it('css', function() {
    var pkg = getPackage('css');
    Object.keys(pkg.files).should.eql(['index.css', 'base.css', 'other.css']);
    pkg.files['index.css'].dependencies.should.eql(['./base.css']);
    pkg.files['base.css'].dependencies.should.eql(['./other.css']);
    pkg.files['other.css'].dependencies.should.eql([]);
  });

  it('css-deps', function() {
    var pkg = getPackage('css-deps');
    Object.keys(pkg.files).should.eql(['index.css']);
    pkg.files['index.css'].dependencies.should.eql(['b']);

    var bPkg = pkg.dependencies.b;
    bPkg.files['src/b.css'].dependencies.should.eql(['./c.css']);
    bPkg.files['src/c.css'].dependencies.should.eql([]);
  });

  xit('pass extraDeps', function() {
    var pkg = getPackage('pass-extradeps', {extraDeps: {handlebars: 'handlebars'}});
    var bPkg = pkg.dependencies.b;
    bPkg.files['index.js'].dependencies.should.eql(['./b.handlebars', 'handlebars']);
    should.exists(pkg.dependencies.handlebars);
  });

  it('js require css', function() {
    var pkg = getPackage('js-require-css');
    pkg.files['index.js'].dependencies.should.eql(['./a.css']);
    pkg.files['a.css'].dependencies.should.eql(['./b.css']);
    pkg.files['b.css'].dependencies.should.eql([]);
  });

  it('cascade dependency', function() {
    var pkg = getPackage('cascade');
    var pkgDeps = pkg.dependencies;
    Object.keys(pkgDeps).should.eql(['b']);
    pkgDeps['b'].should.eql(pkg.get('b@1.1.0'));
    pkg.files['a.js'].dependencies.should.eql(['b']);
  });

  it('get method', function() {
    var pkg = getPackage('normal');
    var b = pkg.get('b@1.1.0');
    b.main.should.eql('src/b.js');
    b.name.should.eql('b');
    b.version.should.eql('1.1.0');
    Object.keys(b.dependencies).should.eql(['d', 'c']);
    Object.keys(b.files).should.eql(['src/b.js', 'src/b.tpl']);

    var self = pkg.get('a@1.0.0');
    self.should.equal(pkg);
  });

  xit('set method', function() {
    var pkg = getPackage('normal');
    pkg.set({id: 'b@1.1.0'});
    pkg.get('b@1.1.0').should.eql({id: 'b@1.1.0'});

    pkg._parse();
    pkg.get('b@1.1.0').should.eql({id: 'b@1.1.0'});

    pkg.set({id: 'b@1.1.0', name: 'b'});
    pkg.get('b@1.1.0').should.eql({id: 'b@1.1.0'});
  });

  it('getPackages method', function() {
    var pkg = getPackage('normal');
    var pkgs = pkg.getPackages();

    var b = pkg.get('b@1.1.0');
    pkgs['b@1.1.0'].should.equal(b);

    Object.keys(b.getPackages()).should.eql([
      'd@0.1.0',
      'c@1.1.1',
      'b@1.1.0',
      'd@0.1.1',
      'e@1.1.0'
    ]);
  });

  it('require other extension', function() {
    var pkg = getPackage('require-other-ext');
    pkg.files['index.js'].dependencies.should.eql(['./a.runtime.js', './jquery.plugin.js', './b.ext', 'c.js']);
    pkg.files['a.runtime.js'].dependencies.should.eql([]);
    pkg.files['b.ext'].dependencies.should.eql([]);
    pkg.files['jquery.plugin.js'].dependencies.should.eql([]);
  });

  it('should not throw when not specifing pkg.main', function() {
    var pkg = getPackage('no-main');
    pkg.files['a.js'].dependencies.should.eql([]);
  });

  it('should require directory', function() {
    var pkg = getPackage('require-directory');
    pkg.files['lib/index.js'].dependencies.should.eql([]);
    pkg.files['index.js'].dependencies.should.eql(['./lib/index.js']);
  });

  it('should require file first', function() {
    var pkg = getPackage('require-file-first');
    Object.keys(pkg.files).should.eql(['index.js', 'lib.js']);
    pkg.files['lib.js'].dependencies.should.eql([]);
    pkg.files['index.js'].dependencies.should.eql(['./lib.js']);
  });

  it('should support relative main', function() {
    var pkg = getPackage('relative-main');
    Object.keys(pkg.files).length.should.eql(1);
    pkg.files['index.js'].dependencies.should.eql([]);
  });

  it('should support no extension main', function() {
    var pkg = getPackage('no-ext-main');
    Object.keys(pkg.files).length.should.eql(1);
    pkg.files['index.js'].dependencies.should.eql([]);
  });

  it('skip package', function() {
    var pkg = getPackage('normal', {skip: ['b', './b.js']});
    pkg.files['a.js'].dependencies.should.eql(['d', './a.json', './a.handlebars']);
    Object.keys(pkg.files).should.eql(['a.js', 'a.json', 'a.handlebars', 'c.js']);
  });

  it('ignore package', function() {
    var pkg = getPackage('no-installed-package', {ignore: ['b']});
    pkg.files['index.js'].dependencies.should.eql(['b', './a.js']);
  });

  it('set dependencies', function() {
    var pkg = getPackage('set-deps');
    var pkgB = pkg.dependencies['b'];
    pkgB.main = 'index.js'; // useless
    pkgB.dependencies = {
      'import-style': pkg.dependencies['import-style'],
      'no-exist': {name: 'a'}
    };
    should.exists(pkgB.dependencies['import-style']);
    pkgB.dependencies['import-style'].should.equal(pkg.get('import-style@1.0.0'));

    should.not.exists(pkgB.dependencies['no-exist']);
  });

  it('moduleDir', function() {
    var pkg = getPackage('module-dir', {moduleDir: 'spm-modules'});
    pkg.files[pkg.main].dependencies.should.eql(['b']);
  });

  it('require file in package', function() {
    var pkg = getPackage('file-in-package');
    pkg.files['index.js'].dependencies.should.eql([
      'b',
      'b/a.js',
      'b/lib/index.js',
      'b/lib/b.js'
    ]);
    var deps = pkg.files['index.js']._dependencies;
    Object.keys(deps).length.should.eql(4);
    deps['b'].pkg.name.should.eql('b');
    deps['b'].path.should.eql('index.js');
    deps['b/a'].pkg.name.should.eql('b');
    deps['b/a'].path.should.eql('a.js');
    deps['b/lib'].pkg.name.should.eql('b');
    deps['b/lib'].path.should.eql('lib/index.js');
    deps['b/lib/b.js'].pkg.name.should.eql('b');
    deps['b/lib/b.js'].path.should.eql('lib/b.js');

    var pkgB = pkg.get('b@1.0.0');
    pkgB.files['lib/b.js'].dependencies.should.eql(['c/c.js']);
    should.exist(pkgB.files['a.js']);
    should.exist(pkgB.files['lib/b.js']);
    should.exist(pkgB.files['lib/index.js']);

    var pkgC = pkg.get('c@1.0.0');
    should.exist(pkgC.files['c.js']);
  });

  it('unknown name', function() {
    (function() {
      getPackage('unknown-name')._parse();
    }).should.throw('unknown name /a required by test/fixtures/spm/unknown-name/index.js');
  });

  describe('error', function() {

    it('not found ./b', function() {
      (function() {
        getPackage('not-found')._parse();
      }).should.throw('test/fixtures/spm/not-found/b not found that required by test/fixtures/spm/not-found/index.js');
    });

    it('not found ./b.js', function() {
      (function() {
        getPackage('not-found2')._parse();
      }).should.throw('test/fixtures/spm/not-found2/b.js not found that required by test/fixtures/spm/not-found2/index.js');
    });

    it('no matched version', function() {
      (function() {
        getPackage('unmatch-version')._parse();
      }).should.throw('no matched version of a');
    });

    it('detect main type', function() {
      (function() {
        getPackage('main-type-error')._parse();
      }).should.throw('pkg.spm.main should be string.');
    });

    it('detect output type', function() {
      (function() {
        getPackage('output-type-error')._parse();
      }).should.throw('pkg.spm.output should be array.');
    });

    it('dir not specified', function() {
      (function() {
        new SpmPackage();
      }).should.throw('miss the first argument');
    });

    it('no installed package but required', function() {
      (function() {
        getPackage('no-installed-package')._parse();
      }).should.throw('b is not in dependencies but required by test/fixtures/spm/no-installed-package/index.js');
    });

    it('recursive', function() {
      (function() {
        getPackage('recursive')._parse();
      }).should.throw('found test/fixtures/spm/recursive/index.js has recursive dependency');
    });
  });
});

function getPackage(name, options) {
  return new SpmPackage(join(base, name), options);
}
