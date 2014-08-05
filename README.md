# father [![Build Status](https://travis-ci.org/popomore/father.png?branch=master)](https://travis-ci.org/popomore/father) [![Coverage Status](https://coveralls.io/repos/popomore/father/badge.png?branch=master)](https://coveralls.io/r/popomore/father?branch=master)

A package parser that can resolve self and dependencies, supporting [spm](https://github.com/spmjs/spm) / [component](https://github.com/component/component).

---

## Install

```
$ npm install father -g
```

## Usage

```
// using SpmPackage
var Package = require('father').SpmPackage;
var pkg = new Package('path/to/package')
console.log(pkg.name);
console.log(pkg.version);
console.log(pkg.main);
console.log(pkg.dependencies); // return a object contains dependencies
console.log(pkg.get('each')); // return a package named each

// using ComponentPackage
var Package = require('father').ComponentPackage;
```

## Properties

The properties of Package instance

### pkg.id

Unique id for each package

`= {pkg.name}@{pkg.version}`

### pkg.name `require`

Package's name

### pkg.version `require`

Package's version

### pkg.main

Entry point of the package, default is `index.js`

### pkg.dependencies

Package's dependencies, each one will return a Package instance

### pkg.files

All used files will exist in pkg.files, it will be parsed from pkg.main. Each file contains dependent files (no deep dependencies).

Example below

```
{
  files: {
    'index.js': {
      dependencies: ['each', './feature']
    }
  }
}
```

### pkg.dest

The base directory of the package

### pkg.origin

The origin package info

### pkg.output

Export files when build

## Method

### pkg.get(pkg.id)

Get a package of id

### pkg.set(pkg)

Set a package

### pkg.getPackages()

Get all dependent packages

## Options

The options when instantiation

```
new Package('path/to/package', options);
```

### entry

Generally, files will be parsed from pkg.main, no dependent file will not be included. `entry` will be another entry point.

Files

```
// a.js <- pkg.main
console.log('no require');

// b.js
require('./c');

// c.js
console.log('no require');
```

Code

```
new Package('path/to/package', {
  entry: ['b.js']
});
```

Return

```
// without entry
{
  ...
  files: {
    'a.js': []
  }
}

// with entry
{
  ...
  files: {
    'a.js': [],
    'b.js': ['./c'],
    'c.js': []
  }
}
```

### skip

```
// a.js
require('b')
```

If you want to skip file or package, you can specify skip. And it won't parse b and won't exist in dependencies.

```
new Package('path/to/package', {
  skip: ['b']
});
```

yield

```
define('a', [], function(require) {
  require('b')
});
```

### ignore

Almost same as skip, however it will exist in dependency.

### moduleDir

Where is your modules

## File object

what you get in pkg.files is file objects

```
var fileObj = pkg.files['a.js'];
```

### lookup

lookup all dependencies and can be filtered or transformed in callback

```
fileObj.lookup(function(fileInfo) {
  // fileInfo.filepath: filepath in package
  // fileInfo.pkg: package info
  // fileInfo.isRelative: required by file in the same package
  // fileInfo.dependent: dependent package
  // fileInfo.extension: exntesion of the file
  return fileInfo.filepath;

  return false; // ignore
});
```

### hasExt

Determine whether it has the matched extension in all dependencies.

```
fileObj.hasExt('css'); // return false
```

## Custom

If you want to use it for your package, you can extend Package and override readPackage.

```
var Package = require('father').Package;
var Custom = Package.extend({
  readPackage: function() {
    // 1. read config file, E.g. component.json
    // 2. return a package contains id, name, version, dependencies, main, dest, files, origin
    // 3. dependencies should contain id, name, version, dest
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
      id: 'b@1.1.0',
      name: 'b',
      version: '1.1.0',
      dest: '/home/user/a/components/b'
    }
  }
}
```

## LISENCE

Copyright (c) 2014 popomore. Licensed under the MIT license.
