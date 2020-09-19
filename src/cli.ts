import {Hooks as CoreHooks, structUtils, MessageName} from '@yarnpkg/core';

const ident = structUtils.makeIdent('angular', 'cli');

export const cliHooks: CoreHooks = {
  validateProject(project, report) {
    const workspace = project.topLevelWorkspace;

    if (
      !workspace.manifest.dependencies.has(ident.identHash) &&
      !workspace.manifest.devDependencies.has(ident.identHash)
    ) {
      report.reportError(
        MessageName.UNNAMED,
        'The root workspace must depend on @angular/cli in order to use @yarnpkg/plugin-angular',
      );
    }
  },

  async setupScriptEnvironment(project, env, makePathWrapper) {
    await makePathWrapper('ng', process.execPath, [
      process.argv[1],
      'run',
      '--top-level',
      '--binaries-only',
      'ng',
    ]);
  },
};
