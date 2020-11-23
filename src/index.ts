import {Hooks as CoreHooks, Plugin} from '@yarnpkg/core';
import {Hooks as PatchHooks} from '@yarnpkg/plugin-patch';

import ng from './commands/ng';
import ngUpdate from './commands/ng/update';
import ngUpdateInteractive from './commands/ng/update-interactive';
import ngVersion from './commands/ng/version';

import {patchHooks} from './patches';
import {cliHooks} from './cli';
import {registerPackageExtensions} from './package-extensions';

const plugin: Plugin<CoreHooks & PatchHooks> = {
  hooks: {
    ...patchHooks,
    ...cliHooks,

    registerPackageExtensions,
  },
  commands: [ng, ngUpdate, ngUpdateInteractive, ngVersion],
};

export default plugin;
