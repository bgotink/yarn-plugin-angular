# Yarn 2 angular plugin

This repository contains a yarn 2 (aka berry) plugin to make the angular CLI work in a plug'n'play context.

It would be awesome if we can get some of these fixes upstreamed to the angular repositories. Until that
happens, this plugin patches the necessary packages to make it work.

## Install

```bash
yarn plugin import https://github.com/bgotink/yarn-plugin-angular/raw/master/bin/%40yarnpkg/plugin-angular.js
```

## Status

This plugin is experimental. It should work for angular 8.3 and 9, but only parts of angular have been tested so far.

- CLI:
  - ✅ Running commands in the angular CLI (`ng build`, `ng test`, `ng e2e`, `ng xi18n` etc)
  - ✅ Running schematics (`ng generate`)
  - ❓ Updating packages (`ng update`)
  - &hellip;
- Devkit:
  - ✅ Building an application (`@angular-devkit/build-angular:browser`)
  - ✅ Serving an application (`@angular-devkit/build-angular:dev-server`)
  - ✅ Running unit tests (`@angular-devkit/build-angular:karma`)
  - ❓ Running e2e tests (`@angular-devkit/build-angular:protractor`)
  - &hellip;
- Other:
  - &hellip;
