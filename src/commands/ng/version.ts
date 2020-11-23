import {BaseCommand} from '@yarnpkg/cli';
import {Configuration, structUtils, YarnVersion} from '@yarnpkg/core';

const VERSION = 'VERSION';

export default class NgCommand extends BaseCommand {
  @BaseCommand.Proxy()
  public args: string[] = [];

  @BaseCommand.Path('ng', '--version')
  @BaseCommand.Path('ng', 'version')
  public async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);

    const exitCode = await this.cli.run([
      'run',
      '--top-level',
      '--binaries-only',
      'ng',
      'version',
      ...this.args,
    ]);

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
