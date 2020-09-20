import {BaseCommand} from '@yarnpkg/cli';

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
  public execute(): Promise<number> {
    return this.cli.run(['run', '--top-level', '--binaries-only', 'ng', ...this.args]);
  }
}
