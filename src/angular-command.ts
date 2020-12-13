import {BaseCommand} from '@yarnpkg/cli';
import {Configuration, Project, scriptUtils, structUtils} from '@yarnpkg/core';

const angularCliIdentHash = structUtils.makeIdent('angular', 'cli').identHash;

export abstract class AngularCommand extends BaseCommand {
  public async ng(args: string[]): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
    const {project, workspace: activeWorkspace} = await Project.find(
      configuration,
      this.context.cwd,
    );

    await project.restoreInstallState();

    const workspacesToLook = [project.topLevelWorkspace];

    if (activeWorkspace != null) {
      workspacesToLook.unshift(activeWorkspace);
    }

    for (const [i, workspace] of workspacesToLook.entries()) {
      if (!workspace.dependencies.has(angularCliIdentHash)) {
        continue;
      }

      if (i === 0 && scriptUtils.hasWorkspaceScript(workspace, 'ng')) {
        break;
      }

      return await scriptUtils.executePackageAccessibleBinary(
        workspace.anchoredLocator,
        'ng',
        args,
        {
          cwd: this.context.cwd,
          project,
          stdin: this.context.stdin,
          stdout: this.context.stdout,
          stderr: this.context.stderr,
        },
      );
    }

    return this.cli.run(['run', 'ng', ...args]);
  }
}
