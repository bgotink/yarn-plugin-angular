import {BaseCommand} from '@yarnpkg/cli';
import {Configuration, Project, scriptUtils, structUtils} from '@yarnpkg/core';

const angularCliIdentHash = structUtils.makeIdent('angular', 'cli').identHash;

export default class NgCommand extends BaseCommand {
  public static usage = BaseCommand.Usage({
    category: 'Angular commands',
    description: 'run an angular command',
    examples: [
      ['Run the "test" target in the "app" project', '$0 ng test app'],
      [
        'Run the "build" target in the "app" project with the "production" configuration',
        '$0 ng build app --configuration production',
      ],
      [
        'Run the "@schematics/angular:component" schematic',
        '$0 ng generate @schematics/angular:component',
      ],
    ],
  });

  @BaseCommand.Proxy()
  public args: string[] = [];

  @BaseCommand.Path('ng')
  public async execute(): Promise<number> {
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

      if (i === 0 && workspace.manifest.scripts.has('ng')) {
        break;
      }

      return await scriptUtils.executePackageAccessibleBinary(
        workspace.anchoredLocator,
        'ng',
        this.args,
        {
          cwd: this.context.cwd,
          project,
          stdin: this.context.stdin,
          stdout: this.context.stdout,
          stderr: this.context.stderr,
        },
      );
    }

    return this.cli.run(['run', 'ng', ...this.args]);
  }
}
