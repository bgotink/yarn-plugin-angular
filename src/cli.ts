import {Hooks as CoreHooks} from '@yarnpkg/core';

export const cliHooks: CoreHooks = {
  async setupScriptEnvironment(_project, _env, makePathWrapper) {
    await makePathWrapper('ng', process.execPath, [process.argv[1], 'ng']);
  },
};
