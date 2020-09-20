/* eslint-disable @typescript-eslint/no-unused-vars */

import {BaseCommand, WorkspaceRequiredError} from '@yarnpkg/cli';
import {
  Cache,
  Configuration,
  Descriptor,
  DescriptorHash,
  execUtils,
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
import {suggestUtils} from '@yarnpkg/plugin-essentials';
import {npmHttpUtils} from '@yarnpkg/plugin-npm';
import assert from 'assert';
import {render} from 'ink';
import * as semver from 'own-semver';
import React from 'react';
import {Readable, Writable} from 'stream';

import {App} from '../../update-interactive/ui/app';
import {UpdateCollection} from '../../update-interactive/ui/app/update-collection';
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
    examples: [['Open the upgrade window', 'yarn ng update --interactive']],
  });

  @BaseCommand.Boolean('--next')
  public includeNext = false;

  @BaseCommand.Boolean('--create-commits,-C')
  public createCommits = false;

  // ??? Add a switch to only update the current workspace vs entire project (project = default)?

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

    const fetchUpdatedDescriptor = async (
      descriptor: Descriptor,
      copyStyle: string,
      range: string,
    ) => {
      const candidate = await suggestUtils.fetchDescriptorFrom(descriptor, range, {
        project,
        cache,
        preserveModifier: copyStyle,
        workspace,
      });

      if (candidate !== null) {
        return candidate.range;
      } else {
        return descriptor.range;
      }
    };

    interface IdentMetadata {
      versions: {[version: string]: UpdatableManifest};
      'dist-tags': {[tag: string]: string};
    }

    const identManifestCache = new Map<IdentHash, Promise<IdentMetadata>>();
    function fetchIdentManifest(ident: Ident): Promise<IdentMetadata> {
      return miscUtils.getFactoryWithDefault(
        identManifestCache,
        ident.identHash,
        () =>
          npmHttpUtils.get(npmHttpUtils.getIdentUrl(ident), {
            configuration,
            ident: ident,
            json: true,
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-expect-error update once updating yarn
            jsonResponse: true,
          }) as Promise<IdentMetadata>,
      );
    }

    const descriptorManifestCache = new Map<DescriptorHash, Promise<UpdatableManifest | null>>();
    function fetchDescriptorManifest(descriptor: Descriptor): Promise<UpdatableManifest | null> {
      return miscUtils.getFactoryWithDefault(
        descriptorManifestCache,
        descriptor.descriptorHash,
        async () => {
          const {versions, 'dist-tags': distTags} = await fetchIdentManifest(descriptor);
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

          return null;
        },
      );
    }

    const suggestionCache = new Map<DescriptorHash, Promise<string[]>>();
    const fetchSuggestions = (descriptor: Descriptor): Promise<string[]> => {
      return miscUtils.getFactoryWithDefault(
        suggestionCache,
        descriptor.descriptorHash,
        async () => {
          const referenceRange = semver.valid(descriptor.range)
            ? semver.major(descriptor.range) > 0
              ? `^${descriptor.range}`
              : `~${descriptor.range}`
            : descriptor.range;

          const [semverCompatible, latest, next] = await Promise.all([
            fetchUpdatedDescriptor(descriptor, descriptor.range, referenceRange),
            fetchUpdatedDescriptor(descriptor, descriptor.range, 'latest'),
            fetchUpdatedDescriptor(descriptor, descriptor.range, 'next').catch(() => null),
          ]);

          const ranges: string[] = [];

          if (semverCompatible !== descriptor.range) {
            ranges.push(semverCompatible);
          }

          if (latest !== semverCompatible && latest !== descriptor.range) {
            if (semver.valid(descriptor.range) && semver.valid(latest)) {
              const start = new semver.SemVer(descriptor.range);
              const end = new semver.SemVer(latest);

              const promises: Promise<string>[] = [];

              if (end.major > 0) {
                for (let major = start.major + 1; major < end.major; major++) {
                  promises.push(fetchUpdatedDescriptor(descriptor, descriptor.range, `^${major}`));
                }
              } else {
                for (let minor = start.minor + 1; minor < end.minor; minor++) {
                  promises.push(
                    fetchUpdatedDescriptor(descriptor, descriptor.range, `~0.${minor}`),
                  );
                }
              }

              ranges.push(
                ...(await Promise.all(promises)).filter(range => range !== descriptor.range),
              );
            }

            ranges.push(latest);
          }

          if (
            this.includeNext &&
            next != null &&
            next !== latest &&
            next !== semverCompatible &&
            next !== descriptor.range
          ) {
            // Only add the next tag if it points to a newer version than latest
            if (!semver.valid(next) || !semver.valid(latest) || semver.gte(next, latest)) {
              ranges.push(next);
            }
          }

          return ranges;
        },
      );
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
        fetchDescriptorManifest={fetchDescriptorManifest}
        fetchSuggestions={fetchSuggestions}
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
          const message = ['ng update --interactive', '', 'Update packages:', ''];

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

            await xfs.mktempPromise(async logDir => {
              const logFile = ppath.join(logDir, 'ng-update.log' as Filename);
              const writeLogStream = xfs.createWriteStream(logFile);

              const resultCode = await scriptUtils.executeWorkspaceAccessibleBinary(
                topLevelWorkspace,
                'ng',
                [
                  'update',
                  '--migrate-only',
                  structUtils.stringifyIdent(ident),
                  '--from',
                  migrate.from,
                  ...(migrate.to != null ? ['--to', migrate.to] : []),
                  ...(this.createCommits ? ['--create-commits'] : []),
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
                  `Failed to run migrations for ${structUtils.stringifyIdent(ident)}:`,
                );

                await new Promise((resolve, reject) => {
                  const readLogStream = xfs.createReadStream(logFile);
                  const logStream = report.createStreamReporter();

                  readLogStream.pipe(logStream);

                  logStream.on('end', resolve);
                  readLogStream.on('error', reject);
                });
              }
            });
          }
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
        stdin: Readable.from(message),
        stdout: new Writable(),
        stderr: new Writable(),
      });
    } catch (e) {
      throw new Error(`Failed to create commit: ${e.message}`);
    }
  }
}
