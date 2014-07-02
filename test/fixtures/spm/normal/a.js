require('b');
require('./b.js');
require('d');
require('./a.json');
require('./a.handlebars');

var a = 'zh';
require('./lang/' + a);
