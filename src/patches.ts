import {Hooks as CoreHooks, IdentHash, structUtils} from '@yarnpkg/core';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';
import {satisfies} from 'own-semver';

import angularDevkitBuildAngularPatch from './patches/@angular-devkit/build-angular.patch';
import angularDevkitCorePatch from './patches/@angular-devkit/core.patch';
import angularCliPatch from './patches/@angular/cli.patch';
import angularCompilerCliPatch from './patches/@angular/compiler-cli.patch';
import ngtoolsWebpackPatch from './patches/@ngtools/webpack.patch';
import karmaPatch from './patches/karma.patch';
import typescriptPatch from './patches/typescript.patch';

const PATCHES = new Map<IdentHash, [patch: string, restriction: string | void]>([
  [
    structUtils.makeIdent('angular-devkit', 'build-angular').identHash,
    [angularDevkitBuildAngularPatch, undefined],
  ],
  [structUtils.makeIdent('angular-devkit', 'core').identHash, [angularDevkitCorePatch, '< 11']],
  [structUtils.makeIdent('angular', 'cli').identHash, [angularCliPatch, '< 11']],
  [
    structUtils.makeIdent('angular', 'compiler-cli').identHash,
    [angularCompilerCliPatch, undefined],
  ],
  [structUtils.makeIdent('ngtools', 'webpack').identHash, [ngtoolsWebpackPatch, undefined]],
  [structUtils.makeIdent(null, 'karma').identHash, [karmaPatch, undefined]],
  [structUtils.makeIdent(null, 'typescript').identHash, [typescriptPatch, undefined]],
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

    return PATCHES.get(structUtils.parseIdent(name.slice(TAG.length)).identHash)?.[0] || null;
  },

  reduceDependency: async (dependency, project) => {
    if (project.configuration.get('nodeLinker') === 'node-modules') {
      return dependency;
    }

    const patch = PATCHES.get(dependency.identHash);

    if (patch == null || (patch[1] != null && !satisfies(dependency.range, patch[1]))) {
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
