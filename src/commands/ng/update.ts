import {AngularCommand} from '../../angular-command';

export default class extends AngularCommand {
  @AngularCommand.Proxy()
  public args: string[] = [];

  @AngularCommand.Path('ng', 'update')
  public execute(): Promise<number> {
    return this.ng(['update', ...this.args]);
  }
}
