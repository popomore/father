'use strict';

var util = require('../lib/util');

describe('Father.Util', function() {

  it('resolvePath', function() {
    util.resolvePath('./a.js', 'b.js').should.eql('a.js');
    util.resolvePath('./a', 'b.js').should.eql('a');
    util.resolvePath('../a.js', 'src/b.js').should.eql('a.js');
    util.resolvePath('a.js', 'b/c/d.js').should.eql('a.js');
    util.resolvePath('a.js').should.eql('a.js');
    (function() {
      util.resolvePath('../a.js', 'b.js');
    }).should.throw('../a.js is out of bound');
  });

});
