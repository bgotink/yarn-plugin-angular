# Yarn 2 angular plugin

This repository contains a yarn 2 (aka berry) plugin for angular development.

## Install

```bash
yarn plugin import https://github.com/bgotink/yarn-plugin-angular/raw/latest/bin/%40yarnpkg/plugin-angular.js
```

## Angular CLI

This plugin makes the Angular CLI available in your entire monorepository via `yarn ng` if it's installed in the project's root workspace.

## Interactive update

This plugins adds a powerful interactive update command. Try it out using `yarn ng update --interactive`.

Some of the features of this command:

- 🙆‍♂️ It gives an extensive overview of what you're updating before actually performing the update
- 📦 Full monorepository support: every workspace in your repository gets updated, not just the root workspace
- 📝 By using the Yarn APIs the update command seamlessly uses the correct registries with any configured authentication.

## Angular in yarn's Plug-n-Play mode

This plugin's PnP support is experimental. It should work for angular 8.3, 9 and 10, but only parts of angular have been tested so far.
If you're not using PnP, everything should work as is.

- CLI:
  - ✅ Running commands in the angular CLI (`ng build`, `ng test`, `ng e2e`, `ng xi18n` etc)
  - ✅ Running schematics (`ng generate`)
  - ❓ Updating packages (`ng update`)
  - &hellip;
- Devkit:
  - ✅ Building an application (`@angular-devkit/build-angular:browser`)
  - ✅ Serving an application (`@angular-devkit/build-angular:dev-server`)
  - ✅ Running unit tests (`@angular-devkit/build-angular:karma`)
  - ✅ Running e2e tests (`@angular-devkit/build-angular:protractor`)
  - &hellip;
- Other:
  - &hellip;
