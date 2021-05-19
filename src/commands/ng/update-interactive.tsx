/* eslint-disable @typescript-eslint/no-unused-vars */

import {BaseCommand, WorkspaceRequiredError} from '@yarnpkg/cli';
import {
  Cache,
  Configuration,
  Descriptor,
  DescriptorHash,
  execUtils,
  formatUtils,
  Ident,
  IdentHash,
  MessageName,
  miscUtils,
  Project,
  scriptUtils,
  StreamReport,
  structUtils,
} from '@yarnpkg/core';
import {Filename, ppath, xfs} from '@yarnpkg/fslib';
import {npmHttpUtils} from '@yarnpkg/plugin-npm';
import assert from 'assert';
import {render} from 'ink';
import * as semver from 'own-semver';
import React from 'react';
import {Readable, Writable} from 'stream';

import {App, UpdateCollection} from '../../update-interactive/ui/app';
import {UpdateResolver} from '../../update-interactive/update-resolver';
import {cleanRange, getRange, UpdatableManifest} from '../../update-interactive/utils';

function getAllDependencies(
  project: Project,
): Map<DescriptorHash, {requested: Descriptor; installed?: Descriptor}> {
  const installedDependencies = new Map<
    DescriptorHash,
    {requested: Descriptor; installed?: Descriptor}
  >();

  for (const workspace of project.workspaces) {
    for (const dependencyType of ['dependencies', 'devDependencies'] as const) {
      for (const requested of workspace.manifest[dependencyType].values()) {
        if (project.tryWorkspaceByDescriptor(requested)) {
          continue;
        }

        installedDependencies.set(requested.descriptorHash, {
          requested,
          installed: workspace.dependencies.get(requested.identHash),
        });
      }
    }

    for (const requested of workspace.manifest.peerDependencies.values()) {
      if (project.tryWorkspaceByDescriptor(requested)) {
        continue;
      }

      if (!installedDependencies.has(requested.descriptorHash)) {
        installedDependencies.set(requested.descriptorHash, {
          requested,
          installed: undefined,
        });
      }
    }
  }

  return installedDependencies;
}

export default class NgUpdateInteractiveCommand extends BaseCommand {
  public static usage = BaseCommand.Usage({
    category: 'Angular commands',
    description: 'open the interactive upgrade interface',
    details: `
      This command opens a fullscreen terminal interface where you can see the packages used by your application, their status compared to the latest versions available on the remote registry, and let you upgrade.
    `,
    examples: [['Open the upgrade window', 'yarn ng update-interactive']],
  });

  @BaseCommand.Boolean('--next', {
    description: 'Use the prerelease version, including beta and RCs',
  })
  public includeNext = false;

  @BaseCommand.Boolean('--create-commits,-C', {
    description: 'Create source control commits for updates and migrations',
  })
  public createCommits = false;

  @BaseCommand.Path('ng', 'update-interactive')
  @BaseCommand.Path('ng', 'update', '--interactive')
  public async execute(): Promise<number> {
    const configuration = await Configuration.find(this.context.cwd, this.context.plugins);
    const {project, workspace} = await Project.find(configuration, this.context.cwd);
    const cache = await Cache.find(configuration);

    if (!workspace) {
      throw new WorkspaceRequiredError(project.cwd, this.context.cwd);
    }

    await project.restoreInstallState();

    const {topLevelWorkspace} = project;

    {
      const availableBinaries = await scriptUtils.getWorkspaceAccessibleBinaries(topLevelWorkspace);
      if (!availableBinaries.has('ng')) {
        throw new Error('Expected @angular/cli to be installed in the root workspace');
      }
    }

    const allDependencies = getAllDependencies(project);
    const updateResolver = new UpdateResolver(project, cache, this.includeNext);

    interface IdentMetadata {
      versions: {[version: string]: UpdatableManifest};
      'dist-tags': {[tag: string]: string};
    }

    const identManifestPromises = new Map<IdentHash, Promise<void>>();
    const identManifestCache = new Map<IdentHash, IdentMetadata>();
    function fetchIdentManifest(ident: Ident): Promise<void> {
      return miscUtils.getFactoryWithDefault(identManifestPromises, ident.identHash, async () => {
        identManifestCache.set(
          ident.identHash,
          await npmHttpUtils.get(npmHttpUtils.getIdentUrl(ident), {
            configuration,
            ident: ident,
            json: true,
            jsonResponse: true,
          }),
        );
      });
    }

    const descriptorManifestCache = new Map<DescriptorHash, UpdatableManifest>();
    function getDescriptorManifest(descriptor: Descriptor): UpdatableManifest {
      return miscUtils.getFactoryWithDefault(
        descriptorManifestCache,
        descriptor.descriptorHash,
        () => {
          const identManifest = identManifestCache.get(descriptor.identHash);

          if (identManifest == null) {
            throw new Error(`Pre-fetch data before calling synchronous API`);
          }

          const {versions, 'dist-tags': distTags} = identManifest;
          let range = cleanRange(descriptor.range);

          if (distTags[range]) {
            range = distTags[range];
          }

          if (versions[range]) {
            return versions[range];
          }

          const semverRange = getRange(range);
          if (semverRange != null) {
            const version = semver.minSatisfying(Object.keys(versions), semverRange);
            if (version != null) {
              return versions[version];
            }
          }

          return {
            name: structUtils.stringifyIdent(descriptor),
            version: `0.0.0-not-found`,
          };
        },
      );
    }

    const fetchSuggestions = (ident: Ident): Promise<void> => updateResolver.fetch(ident);
    const getSuggestions = (descriptor: Descriptor, requirement: semver.Range | null): string[] => {
      return updateResolver.getPossibleVersions(descriptor, {requirement});
    };

    let commitUpdateCollection: ((state: UpdateCollection) => void) | undefined;
    const updateCollectionPromise = new Promise<UpdateCollection>(
      resolve => (commitUpdateCollection = resolve),
    );

    await render(
      <App
        configuration={configuration}
        project={project}
        dependencies={Array.from(allDependencies.values())}
        fetchMeta={fetchIdentManifest}
        getDescriptorMeta={getDescriptorManifest}
        fetchSuggestions={fetchSuggestions}
        getSuggestions={getSuggestions}
        commitUpdateCollection={commitUpdateCollection!}
      />,
      {
        stdout: this.context.stdout as NodeJS.WriteStream,
        stderr: this.context.stderr as NodeJS.WriteStream,
        stdin: this.context.stdin as NodeJS.ReadStream,
      },
    ).waitUntilExit();

    // Insert newline to ensure new printed lines aren't added on the last line of the ink app
    this.context.stdout.write('\n');

    const updateCollection = await updateCollectionPromise;
    let hasChanged = false;

    for (const workspace of project.workspaces) {
      for (const dependencyType of [
        'dependencies',
        'peerDependencies',
        'devDependencies',
      ] as const) {
        const dependencies = workspace.manifest[dependencyType];
        for (const [ident, dependency] of dependencies) {
          const newRange = updateCollection.get(ident)?.updates.get(dependency.descriptorHash);
          if (newRange != null) {
            dependencies.set(ident, structUtils.makeDescriptor(dependency, newRange));
            hasChanged = true;
          }
        }
      }
    }

    if (!hasChanged) {
      return 0;
    }

    const report = await StreamReport.start(
      {
        configuration,
        stdout: this.context.stdout,
        includeLogs: !this.context.quiet,
      },
      async report => {
        await project.install({cache, report});

        if (report.hasErrors()) {
          return;
        }

        if (this.createCommits) {
          const message = ['yarn ng update-interactive', '', 'Update packages:', ''];

          for (const {ident} of updateCollection.values()) {
            message.push(`- ${structUtils.stringifyIdent(ident)}`);
          }

          await this.createCommit(message.join('\n'));
        }

        await report.startTimerPromise('Running migrations', async () => {
          const updatesWithMigrations = Array.from(updateCollection.values()).filter(
            item => item.migrate != null,
          );
          const progress = StreamReport.progressViaCounter(updatesWithMigrations.length);
          report.reportProgress(progress);

          process.env.NG_DISABLE_VERSION_CHECK = '1';

          await xfs.mktempPromise(async logDir => {
            xfs.detachTemp(logDir);

            for (const {ident, migrate} of updatesWithMigrations.values()) {
              assert(migrate != null);

              report.reportInfo(
                null,
                `Migrating ${structUtils.prettyIdent(
                  configuration,
                  ident,
                )} from ${structUtils.prettyRange(configuration, migrate.from)}${
                  migrate.to ? ` to ${structUtils.prettyRange(configuration, migrate.to)}` : ''
                }`,
              );
              progress.tick();

              const logFile = ppath.join(
                logDir,
                `ng-update-${structUtils.slugifyIdent(ident)}.log` as Filename,
              );
              const writeLogStream = xfs.createWriteStream(logFile);

              const resultCode = await scriptUtils.executeWorkspaceAccessibleBinary(
                topLevelWorkspace,
                'ng',
                [
                  'update',
                  structUtils.stringifyIdent(ident),
                  '--migrate-only',
                  '--from',
                  migrate.from,
                  ...(migrate.to != null ? ['--to', migrate.to] : []),
                  ...(this.createCommits ? ['--create-commits'] : ['--allow-dirty']),
                ],
                {
                  cwd: topLevelWorkspace.cwd,
                  stdin: null,
                  stderr: writeLogStream,
                  stdout: writeLogStream,
                },
              );

              if (resultCode !== 0) {
                report.reportError(
                  MessageName.UNNAMED,
                  `Failed to run migrations for ${structUtils.stringifyIdent(ident)}.`,
                );
              }
            }

            report.reportInfo(
              MessageName.UNNAMED,
              `Migration logs can be found at ${formatUtils.pretty(
                configuration,
                logDir as any,
                formatUtils.Type.PATH,
              )}`,
            );
          });
        });
      },
    );

    return report.exitCode();
  }

  private async createCommit(message: string) {
    try {
      // Stage entire working tree for commit
      await execUtils.execvp('git', ['add', '-A'], {cwd: this.context.cwd, strict: true});

      // Commit with the message passed via stdin to avoid bash escaping issues.
      await execUtils.pipevp('git', ['commit', '--no-verify', '-F', '-'], {
        cwd: this.context.cwd,
        strict: true,
        stdin: Readable.from(message, {objectMode: false}),
        stdout: new Writable(),
        stderr: new Writable(),
      });
    } catch (e) {
      throw new Error(`Failed to create commit: ${e.message}`);
    }
  }
}
