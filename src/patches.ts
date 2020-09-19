import {Hooks as CoreHooks, structUtils} from '@yarnpkg/core';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import angularDevkitBuildAngularPatch from './patches/@angular-devkit/build-angular.patch';
import angularDevkitCorePatch from './patches/@angular-devkit/core.patch';
import angularCliPatch from './patches/@angular/cli.patch';
import angularCompilerCliPatch from './patches/@angular/compiler-cli.patch';
import ngtoolsWebpackPatch from './patches/@ngtools/webpack.patch';
import karmaPatch from './patches/karma.patch';
import typescriptPatch from './patches/typescript.patch';

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
  [structUtils.makeIdent(null, 'typescript').identHash, typescriptPatch],
]);

const TAG = 'ng/';

/* eslint-disable @typescript-eslint/require-await */
export const patchHooks: Partial<CoreHooks & PatchHooks> = {
  /**
   * Patch a couple of packages to make them work with pnp
   */

  getBuiltinPatch: async (project, name) => {
    if (!name.startsWith(TAG)) {
      return;
    }

    return PATCHES.get(structUtils.parseIdent(name.slice(TAG.length)).identHash) || null;
  },

  reduceDependency: async (dependency, project) => {
    if (project.configuration.get('nodeLinker') === 'node-modules') {
      return dependency;
    }

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
};
