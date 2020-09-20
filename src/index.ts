import {Hooks as CoreHooks, Plugin} from '@yarnpkg/core';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import ng from './commands/ng';
import ngUpdateInteractive from './commands/ng/update';

import {patchHooks} from './patches';
import {cliHooks} from './cli';
import {registerPackageExtensions} from './package-extensions';

const plugin: Plugin<CoreHooks & PatchHooks> = {
  hooks: {
    ...patchHooks,
    ...cliHooks,

    registerPackageExtensions,
  },
  commands: [ng, ngUpdateInteractive],
};

export default plugin;
