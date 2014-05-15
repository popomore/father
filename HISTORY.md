# History

---

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
