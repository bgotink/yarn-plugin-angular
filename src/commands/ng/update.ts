import {BaseCommand} from '@yarnpkg/cli';

export default class NgCommand extends BaseCommand {
  @BaseCommand.Proxy()
  public args: string[] = [];

  @BaseCommand.Path('ng', 'update')
  public execute(): Promise<number> {
    return this.cli.run(['run', '--top-level', '--binaries-only', 'ng', 'update', ...this.args]);
  }
}
