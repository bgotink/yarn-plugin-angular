import {Configuration, structUtils, YarnVersion} from '@yarnpkg/core';
import {AngularCommand} from '../../angular-command';

const VERSION = 'VERSION';

export default class extends AngularCommand {
  @AngularCommand.Proxy()
  public args: string[] = [];

  @AngularCommand.Path('ng', '--version')
  @AngularCommand.Path('ng', 'version')
  public async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);

    const exitCode = await this.ng(['version']);

    function prettyIdent(scope: string, name: string) {
      return structUtils.prettyIdent(configuration, structUtils.makeIdent(scope, name));
    }

    function prettyVersion(version: string) {
      return structUtils.prettyRange(configuration, version);
    }

    this.context.stdout.write(
      `Using ${prettyIdent('yarnpkg', 'cli')} version ${prettyVersion(
        YarnVersion ?? '<unknown>',
      )} with ${prettyIdent('yarnpkg', 'plugin-angular')} version ${prettyVersion(VERSION)}\n\n`,
    );

    return exitCode;
  }
}
