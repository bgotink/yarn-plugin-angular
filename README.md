# Yarn 2 angular plugin

This repository contains a yarn 2 (aka berry) plugin for angular development.

## Install

```bash
yarn plugin import https://github.com/bgotink/yarn-plugin-angular/raw/latest/bin/%40yarnpkg/plugin-angular.js
```

## Angular CLI in monorepositories

This plugin makes the Angular CLI available in your entire monorepository.
Once installed in the root `package.json` file, running `ng` will be available everywhere:

- You can run `yarn ng` in the entire monorepository, regardless of whether the current package has a dependency on `@angular/cli`.
- You can use `ng` in scripts in the `scripts` section of any `package.json` of your monorepository.

## Interactive update

This plugins adds a powerful interactive update command. Try it out using `yarn ng update --interactive`.

Some of the features of this command:

- 🙆‍♂️ It gives an extensive overview of what you're updating before actually performing the update
- 📦 Full monorepository support: every workspace in your repository gets updated, not just the root workspace
- 📝 By using the Yarn APIs the update command seamlessly uses the correct registries with any configured authentication.

## Angular in yarn's Plug-n-Play mode

This plugin's PnP support is experimental. It should work for angular 8.3, 9, 10, and 11, but only parts of angular have been tested so far.
If you're not using PnP, everything should work as is.

- CLI:
  - ✅ Running commands in the angular CLI (`ng build`, `ng test`, `ng e2e`, `ng xi18n` etc)
  - ✅ Running schematics (`ng generate`)
  - ❌ Updating packages (`ng update`)
  - &hellip;
- Devkit:
  - ✅ Building an application (`@angular-devkit/build-angular:browser`)
  - ✅ Serving an application (`@angular-devkit/build-angular:dev-server`)
  - ✅ Running unit tests (`@angular-devkit/build-angular:karma`)
  - ✅ Running e2e tests (`@angular-devkit/build-angular:protractor`)
  - &hellip;
- Other:
  - &hellip;

## Contributing

When making changes, use `yarn build` to build the plugin. This'll create two
files.

- At `bundles/@yarnpkg/plugin-angular.js` you'll find the minified bundle, similar to the released file in the `bin` folder.
- The second file, `bundles/@yarnpkg/plugin-angular.dev.js` is not minified. This is useful when debugging the plugin, as it keeps error stacktraces readable and it allows for easier step-through debugging via the Chrome inspector.

The patchfiles are zipped and included in the `src/patches` folder. Use `yarn generate-patches` before `yarn build` to update these zipped patches.

## License

See LICENSE.md
