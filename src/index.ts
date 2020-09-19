import {Hooks as CoreHooks, Plugin} from '@yarnpkg/core';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import {patchHooks} from './patches';
import {cliHooks} from './cli';
import {registerPackageExtensions} from './package-extensions';

const plugin: Plugin<CoreHooks & PatchHooks> = {
  hooks: {
    ...patchHooks,
    ...cliHooks,

    registerPackageExtensions,
  },
};

export default plugin;
