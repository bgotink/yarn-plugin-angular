import {AngularCommand} from '../angular-command';

export default class extends AngularCommand {
  public static usage = AngularCommand.Usage({
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

  @AngularCommand.Proxy()
  public args: string[] = [];

  @AngularCommand.Path('ng')
  public execute(): Promise<number> {
    return this.ng(this.args);
  }
}
