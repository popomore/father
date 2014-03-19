# father [![Build Status](https://travis-ci.org/popomore/father.png?branch=master)](https://travis-ci.org/popomore/father) [![Coverage Status](https://coveralls.io/repos/popomore/father/badge.png?branch=master)](https://coveralls.io/r/popomore/father?branch=master) 

A package parser that can resolve self and dependencies, supporting spm/component.

---

## Install

```
$ npm install father -g
```

## Usage

```
var Package = require('father').ComponentPackage;
var pkg = new Package('path/to/package')
console.log(pkg.name);
console.log(pkg.version);
console.log(pkg.main);
console.log(pkg.dependencies); // return a object contains dependencies
console.log(pkg.get('each')); // return a package named each
```

## Custom

If you want to use it for your package, you can extend Package and override readPackage.

```
var Package = require('father').Package;
var Custom = Package.extend({
  readPackage: function() {
    // read config file, E.g. component.json
    // return a package contains id, name, version, dependencies, main, dest, origin
    // dependencies should contain id, dest 
  };
})
```

Example for returned object by readPackage

```
{
  id: 'a',
  name: 'a'
  version: '1.0.0',
  main: 'index.js',
  dest: '/home/user/a',
  dependencies: {
    b: {
      id: 'b',
      dest: '/home/user/a/components/b'
    }
  }
}
```

## LISENCE

Copyright (c) 2014 popomore. Licensed under the MIT license.
