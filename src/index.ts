import {Hooks as CoreHooks, Plugin, structUtils, ThrowReport} from '@yarnpkg/core';
import {npath, ppath} from '@yarnpkg/fslib';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import angularDevkitBuildAngularPatch from './patches/@angular-devkit/build-angular.patch';
import angularDevkitCorePatch from './patches/@angular-devkit/core.patch';
import angularCliPatch from './patches/@angular/cli.patch';
import angularCompilerCliPatch from './patches/@angular/compiler-cli.patch';
import ngtoolsWebpackPatch from './patches/@ngtools/webpack.patch';
import karmaPatch from './patches/karma.patch';

const PATCHES = new Map([
  [
    structUtils.makeIdent('angular-devkit', 'build-angular').identHash,
    angularDevkitBuildAngularPatch,
  ],
  [structUtils.makeIdent('angular-devkit', 'core').identHash, angularDevkitCorePatch],
  [structUtils.makeIdent('angular', 'cli').identHash, angularCliPatch],
  [structUtils.makeIdent('angular', 'compiler-cli').identHash, angularCompilerCliPatch],
  [structUtils.makeIdent('ngtools', 'webpack').identHash, ngtoolsWebpackPatch],
  [structUtils.makeIdent(null, 'karma').identHash, karmaPatch],
]);

const TAG = 'ng/';

/* eslint-disable @typescript-eslint/require-await */
const plugin: Plugin<CoreHooks & PatchHooks> = {
  hooks: {
    /**
     * Make the `@angular/cli` binaries available in the entire project, not just at the root level
     */
    setupScriptEnvironment: async (project, env, makePathWrapper) => {
      const angularCliDescriptor = project.topLevelWorkspace.dependencies.get(
        structUtils.makeIdent('angular', 'cli').identHash,
      );

      if (!angularCliDescriptor) {
        return;
      }

      const angularCliLocator = project.storedResolutions.get(angularCliDescriptor.descriptorHash);

      if (!angularCliLocator) {
        throw new Error("Couldn't find resolution for @angular/cli");
      }

      const angularCliPackage = project.storedPackages.get(angularCliLocator);
      if (!angularCliPackage) {
        throw new Error(
          `Assertion failed: The package (${angularCliLocator}) should have been registered`,
        );
      }

      const linker = project.configuration.getLinkers().find(linker =>
        linker.supportsPackage(angularCliPackage, {
          project,
        }),
      );

      if (!linker) {
        throw new Error(
          `Assertion failed: The package (${angularCliLocator}) should have been linked`,
        );
      }

      const packageLocation = await linker.findPackageLocation(angularCliPackage, {
        project,
        report: new ThrowReport(),
      });

      for (const [name, target] of angularCliPackage.bin) {
        await makePathWrapper(name, process.execPath, [
          npath.fromPortablePath(ppath.resolve(packageLocation, target)),
        ]);
      }
    },

    registerPackageExtensions: async (configuration, registerPackageExtension) => {
      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent('angular', 'core'), '^8.0.0'),
        {
          peerDependencies: {
            '@angular/compiler': '^8.0.0',
          },
          peerDependenciesMeta: {
            '@angular/compiler': {optional: true},
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(
          structUtils.makeIdent('angular-devkit', 'build-angular'),
          '< 0.1000.0',
        ),
        {
          dependencies: {
            '@types/karma': '^4.4.3',
            '@types/node': '^14.0.20',
            'pnp-webpack-plugin': '^1.6.0',
          },
          peerDependencies: {
            '@angular/core': '*',
            karma: '~4.4.1',
            protractor: '~5.4.3',
          },
          peerDependenciesMeta: {
            karma: {optional: true},
            protractor: {optional: true},
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'build-angular'), '*'),
        {
          dependencies: {
            '@types/karma': '^4.4.3',
            '@types/node': '^14.0.20',
          },
          peerDependencies: {
            '@angular/core': '*',
            karma: '~4.4.1',
            protractor: '~5.4.3',
          },
          peerDependenciesMeta: {
            karma: {optional: true},
            protractor: {optional: true},
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'core'), '*'),
        {
          dependencies: {
            '@types/node': '^14.0.20',
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'schematics'), '*'),
        {
          dependencies: {
            '@types/node': '^14.0.20',
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent('ngtools', 'webpack'), '*'),
        {
          dependencies: {
            '@types/node': '^14.0.20',
            '@yarnpkg/fslib': '^2.1.0',
          },
          peerDependencies: {
            '@angular/core': '*',
          },
        },
      );

      registerPackageExtension(
        structUtils.makeDescriptor(structUtils.makeIdent(null, 'protractor'), '*'),
        {
          dependenciesMeta: {
            'webdriver-manager': {unplugged: true},
          },
        },
      );
    },

    /**
     * Patch a couple of packages to make them work with pnp
     */

    getBuiltinPatch: async (project, name) => {
      if (!name.startsWith(TAG)) {
        return;
      }

      return PATCHES.get(structUtils.parseIdent(name.slice(TAG.length)).identHash) || null;
    },

    reduceDependency: async dependency => {
      const patch = PATCHES.get(dependency.identHash);

      if (patch == null) {
        return dependency;
      }

      return structUtils.makeDescriptor(
        dependency,
        structUtils.makeRange({
          protocol: `patch:`,
          source: structUtils.stringifyDescriptor(dependency),
          selector: `builtin<${TAG}${structUtils.stringifyIdent(dependency)}>`,
          params: null,
        }),
      );
    },
  },
};

export default plugin;
