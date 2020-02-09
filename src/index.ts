import {Hooks as CoreHooks, Plugin, structUtils, ThrowReport} from '@yarnpkg/core';
import {npath, ppath} from '@yarnpkg/fslib';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import angularDevkitBuildAngularPatch from './patches/@angular-devkit/build-angular.patch';
import angularDevkitCorePatch from './patches/@angular-devkit/core.patch';
import angularCliPatch from './patches/@angular/cli.patch';

const PATCHES = new Map([
  [
    structUtils.makeIdent('angular-devkit', 'build-angular').identHash,
    angularDevkitBuildAngularPatch,
  ],
  [structUtils.makeIdent('angular-devkit', 'core').identHash, angularDevkitCorePatch],
  [structUtils.makeIdent('angular', 'cli').identHash, angularCliPatch],
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
        structUtils.makeDescriptor(structUtils.makeIdent('angular-devkit', 'build-angular'), '*'),
        {
          dependencies: {
            'pnp-webpack-plugin': '^1.6.0',
          },
          peerDependencies: {
            karma: '~4.4.1',
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
