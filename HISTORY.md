# History

---

## 0.11.0

feat(file): filename should be case sensitive on cross-platform

## 0.10.6

Detect spm_modules of current package before one of root package

## 0.10.5

add detecting spm_modules of current package

## 0.10.4

SpmPackage parse spm.buildArgs

## 0.10.3

fix require cache delete for symlink deps

## 0.10.2

support parsing spm.engines

## 0.10.1

searequire -> crequire

## 0.10.0

- use spm_modules as moduleDir by default
- parse package when initialization, not lazy
- file object extend vinyl
- change api: get -> getPackage, set -> setPackage
- new api: getFile, getFiles
- file will not be parsed when ignore

## 0.9.7

Improve require priority

## 0.9.6

do not parse require.async now

## 0.9.5

add fullpath when lookup fileObj

## 0.9.4

fix error when require package that name has `.` 

## 0.9.3

miss extend :smile:

## 0.9.2

ignore package but still parse files

## 0.9.1

use file cache in package scope not global

## 0.9.0

- now support require file in package just like node
- file refactor

## 0.8.7

option moduleDir

## 0.8.6

give fileInfo ignore option when lookup

## 0.8.5

parse entry from pkg.output in the package of the dependencies

## 0.8.4

for windows test

## 0.8.3

dependencies can be set

## 0.8.2

upgrade searequire@1.5.0

## 0.8.1

extra argument to lookup

## 0.8.0

- move extraDeps to transport
- add file object that can lookup all dependencies

## 0.7.3

upgrade searequire@1.3.0

## 0.7.2

searequire instead of requires

## 0.7.1

output support glob

## 0.7.0

**Change** option: ignore -> skip

## 0.6.14

- add devDependencies property
- handle none extension path in spm.main

## 0.6.13

hanlde relative file path in spm.main

## 0.6.12

support require directory

## 0.6.11

update npmignore

## 0.6.10

fix windows path

## 0.6.9

add ignore option, can ignore file or package

## 0.6.8

only father package will concat option.entry and pkg.output

## 0.6.7

should not throw when not specifing pkg.main

## 0.6.6

test file exist first¬

## 0.6.4

require other extension

## 0.6.3

- change order of parseFiles
- throw when recursive dependency

## 0.6.2

only father package will concat options.entry

## 0.6.1

fix componentPackage and improve coverage

## 0.6.0

- option change: output -> entry
- update readme
- improve code structure
- testcase coverage

## 0.5.6

- export getPackages
- no dependency will throw
- ignore extraDeps
- unmatched version will throw

## 0.5.5

detect main/output type in spm package

## 0.5.4

requires not support Buffer now

## 0.5.3

upgrade css-import@0.2.0

## 0.5.2

add output option

## 0.5.1

- pass extraDeps to sub package
- only show css required by js in dependencies

## 0.5.0

- resolve dependent file path
- refactor lookupFiles
- parse css dependency

## 0.4.0

- add output as same as main
- move main to spm.main

## 0.3.1

fix versionCache, use dest as key instead

## 0.3.0

- lazy parse
- trigger `notfound` event when parse a not existed file
- support handlebars, add extra `handlebars` to deps
- add debug

## 0.2.1

fix replace .js

## 0.2.0

add pkg.files

## 0.1.0

First commit
