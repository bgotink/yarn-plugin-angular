import {
  Cache,
  Descriptor,
  FetchOptions,
  Ident,
  IdentHash,
  miscUtils,
  Project,
  ResolveOptions,
  Resolver,
  structUtils,
  ThrowReport,
} from '@yarnpkg/core';
import * as semver from 'own-semver';
import {getUpdatableRange} from './utils/ranges';

function isntNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

const semVerCache = new Map<string, semver.SemVer | null>();
function validSemVer(version: string): semver.SemVer | null {
  let semVer = semVerCache.get(version);

  if (semVer === undefined) {
    const cleanVersion = version.startsWith('npm:') ? version.slice(4) : version;
    semVer = semver.valid(cleanVersion) ? new semver.SemVer(cleanVersion) : null;
    semVerCache.set(version, semVer);
  }

  return semVer;
}

const rangeCache = new Map<string, semver.Range | null>();
function validSemVerRange(range: string): semver.Range | null {
  let semVerRange = rangeCache.get(range);

  if (semVerRange === undefined) {
    const cleanVersion = range.startsWith('npm:') ? range.slice(4) : range;
    semVerRange = semver.validRange(cleanVersion) ? new semver.Range(cleanVersion) : null;
    rangeCache.set(range, semVerRange);
  }

  return semVerRange;
}

function removeVersionsAfterLatest(
  latest: semver.SemVer | null,
  versions: semver.SemVer[],
): semver.SemVer[] {
  if (latest == null) {
    return versions;
  }

  const filtered = versions.filter(version => semver.lte(version, latest));

  return filtered.length ? filtered : versions;
}

function removeOlderVersions(range: string, versions: semver.SemVer[]): semver.SemVer[] {
  let minimumVersion = validSemVer(range);

  if (minimumVersion == null) {
    const validRange = validSemVerRange(range);

    if (validRange == null) {
      return versions;
    }

    minimumVersion = semver.minVersion(validRange);
  }

  if (minimumVersion == null) {
    return versions;
  }

  const filtered = versions.filter(version => semver.gte(version, minimumVersion!));

  return filtered.length ? filtered : versions;
}

function applyRequirement(
  requirement: semver.Range | null,
  versions: semver.SemVer[],
): semver.SemVer[] {
  if (requirement == null) {
    return versions;
  }

  return versions.filter(version => requirement.test(version));
}

function cleanVersions(current: string, versions: semver.SemVer[]): string[] {
  if (versions.length === 0) {
    return [];
  }

  const majors = new Set<string>();
  const minors = new Set<string>();

  const majorMinorMap = new Map<string, string[]>();
  const versionMap = new Map<string, semver.SemVer>();

  // Sort versions descendingly
  versions.sort(semver.rcompare);

  for (const version of versions) {
    const major = `${version.major}`;
    const minor = `${major}.${version.minor}`;

    if (!majors.has(major)) {
      majors.add(major);
      versionMap.set(major, version);
    }

    if (!minors.has(minor)) {
      minors.add(minor);
      versionMap.set(minor, version);

      miscUtils.getArrayWithDefault(majorMinorMap, major).push(minor);
    }
  }

  let versionsToUse: string[];

  switch (majors.size) {
    case 1:
      versionsToUse = Array.from(minors);
      break;
    case 2: {
      const [latest, previous] = majors;

      versionsToUse = [...majorMinorMap.get(latest)!, ...majorMinorMap.get(previous)!];

      break;
    }
    default:
      versionsToUse = Array.from(majors);
  }

  const cleanedVersions = versionsToUse
    .slice(0, 4)
    .map(v => getUpdatableRange(versionMap.get(v)!.format(), current));
  cleanedVersions.reverse();
  return cleanedVersions;
}

export class UpdateResolver {
  private readonly resolver: Resolver;

  private readonly resolveOptions: ResolveOptions;

  private readonly versionPromises: Map<IdentHash, Promise<void>>;

  private readonly versionCache: Map<IdentHash, semver.SemVer[]>;

  private readonly latestPromises: Map<IdentHash, Promise<void>>;

  private readonly latestCache: Map<IdentHash, semver.SemVer | null>;

  constructor(readonly project: Project, cache: Cache, readonly next: boolean) {
    const fetcher = project.configuration.makeFetcher();
    const resolver = project.configuration.makeResolver();

    const report = new ThrowReport();

    const fetchOptions: FetchOptions = {
      project,
      fetcher,
      cache,
      checksums: project.storedChecksums,
      report,
      skipIntegrityCheck: true,
    };

    this.resolver = resolver;
    this.resolveOptions = {...fetchOptions, resolver, fetchOptions};

    this.versionPromises = new Map();
    this.versionCache = new Map();
    this.latestPromises = new Map();
    this.latestCache = new Map();
  }

  public async fetch(ident: Ident): Promise<void> {
    await this.fetchLatest(ident);
    await this.fetchAllVersions(ident);
  }

  public getPossibleVersions(
    descriptor: Descriptor,
    {requirement}: {requirement: semver.Range | null},
  ): string[] {
    const latest = this.getLatest(descriptor);

    const allVersions = applyRequirement(
      requirement,
      removeOlderVersions(
        descriptor.range,
        removeVersionsAfterLatest(latest, this.getAllVersions(descriptor)),
      ),
    );

    return cleanVersions(descriptor.range, allVersions);
  }

  private getLatest(ident: Ident): semver.SemVer | null {
    const latest = this.latestCache.get(ident.identHash);
    if (latest === undefined) {
      throw new Error(
        `Pre-fetch data for ${structUtils.stringifyIdent(ident)} before calling synchronous API`,
      );
    }

    return latest;
  }

  private async fetchLatest(ident: Ident): Promise<void> {
    await miscUtils.getFactoryWithDefault(this.latestPromises, ident.identHash, async () => {
      const latestArray = await this.resolve(ident, 'latest');
      const nextArray = this.next ? await this.resolve(ident, 'next') : [];

      const next = nextArray[0] ?? null;

      let latest = latestArray[0] ?? null;
      if (latest != null && next != null) {
        // Only use next if it's newer than latest
        if (semver.gte(next, latest)) {
          latest = next;
        }
      } else {
        latest = next ?? latest;
      }

      this.latestCache.set(ident.identHash, latest);
    });
  }

  private getAllVersions(ident: Ident): semver.SemVer[] {
    const allVersions = this.versionCache.get(ident.identHash);
    if (allVersions === undefined) {
      throw new Error(
        `Pre-fetch data for ${structUtils.stringifyIdent(ident)} before calling synchronous API`,
      );
    }

    return allVersions;
  }

  private async fetchAllVersions(ident: Ident): Promise<void> {
    await miscUtils.getFactoryWithDefault(this.versionPromises, ident.identHash, async () => {
      this.versionCache.set(ident.identHash, await this.resolve(ident, '*'));
    });
  }

  private async resolve(ident: Ident, range: string): Promise<semver.SemVer[]> {
    const boundDescriptor = this.resolver.bindDescriptor(
      structUtils.makeDescriptor(ident, `${range}`),
      this.project.topLevelWorkspace.anchoredLocator,
      this.resolveOptions,
    );

    const locators = await this.resolver.getCandidates(
      boundDescriptor,
      new Map(),
      this.resolveOptions,
    );

    return locators
      .map(locator => {
        return validSemVer(structUtils.convertToManifestRange(locator.reference));
      })
      .filter(isntNull);
  }
}
