import {Descriptor, miscUtils, structUtils} from '@yarnpkg/core';
import {Comparator, gt, lt, Range, SemVer, valid, validRange} from 'own-semver';

const VERSION_ZERO = new SemVer('0.0.0');

function isntNull<T>(value: T): value is NonNullable<T> {
  return value != null;
}

export function getIntersection(a: Range, b: Range): Range | null {
  if (!a.intersects(b)) {
    return null;
  }

  const set = a.set
    .map(compA => b.set.map(compB => getIntersectionComp(compA, compB)))
    .flat()
    .filter(isntNull);

  if (set.length === 0) {
    return null;
  }

  return new Range(set.map(comp => comp.join(' ')).join('||'));
}

function getIntersectionComp(
  a: readonly Comparator[],
  b: readonly Comparator[],
): readonly Comparator[] | null {
  if ((a.length === 1 && a[0].operator === '=') || a[0].operator === '') {
    return filter(b, a[0].semver);
  } else if ((b.length === 1 && b[0].operator === '=') || b[0].operator === '') {
    return filter(a, b[0].semver);
  }

  const [lowerA, upperA] = getBounds(a);
  const [lowerB, upperB] = getBounds(b);

  let lower: Comparator | undefined;
  let upper: Comparator | undefined;

  if (lowerA == null) {
    lower = lowerB;
  } else if (lowerB == null) {
    lower = lowerA;
  } else {
    if (lowerA.operator === lowerB.operator || lowerA.operator === '>') {
      if (gt(lowerB.semver, lowerA.semver)) {
        lower = lowerB;
      } else {
        lower = lowerA;
      }
    } else {
      if (gt(lowerA.semver, lowerB.semver)) {
        lower = lowerA;
      } else {
        lower = lowerB;
      }
    }
  }

  if (upperA == null) {
    upper = upperB;
  } else if (upperB == null) {
    upper = upperA;
  } else {
    if (upperA.operator === upperB.operator || upperA.operator === '<') {
      if (lt(upperB.semver, upperA.semver)) {
        upper = upperB;
      } else {
        upper = upperA;
      }
    } else {
      if (lt(upperA.semver, upperB.semver)) {
        upper = upperA;
      } else {
        upper = upperB;
      }
    }
  }

  const result = [lower, upper].filter(isntNull);

  if (!result.length) {
    return a;
  } else if (isSatisfiable(result)) {
    return result;
  } else {
    return null;
  }

  function filter(arr: readonly Comparator[], val: SemVer) {
    const result = arr.filter(c => c.test(val));

    return result.length > 0 ? result : null;
  }
}

function getBounds(
  comp: readonly Comparator[],
): [lowerBound: Comparator | undefined, upperBound: Comparator | undefined] {
  return [comp.find(isLowerBound), comp.find(isUpperBound)];
}

function isLowerBound(comp: Comparator) {
  return (comp.operator === '>' || comp.operator === '>=') && comp.semver !== Comparator.ANY;
}

function isUpperBound(comp: Comparator) {
  return (comp.operator === '<' || comp.operator === '<=') && comp.semver !== Comparator.ANY;
}

function isSatisfiable(comparators: Comparator[]) {
  let result = true;
  const remainingComparators = comparators.slice();
  let testComparator = remainingComparators.pop();

  while (result && testComparator) {
    result = remainingComparators.every(otherComparator => {
      return testComparator!.intersects(otherComparator);
    });

    testComparator = remainingComparators.pop();
  }

  return result;
}

export function sortByMaxVersion(descriptors: Descriptor[]): Descriptor[] {
  return descriptors
    .map<[Descriptor, SemVer]>(descriptor => {
      const range = getRange(descriptor.range);

      if (range == null) {
        // No valid range, so...
        return [descriptor, VERSION_ZERO];
      }

      if (valid(range.raw)) {
        return [descriptor, getLowestNextVersion(new SemVer(range.raw))];
      }

      const maxVersionsInRange = range.set.map(parts => {
        for (const part of parts) {
          if (!(part.semver instanceof SemVer)) {
            continue;
          }

          switch (part.operator) {
            case '<':
              return part.semver;
            case '<=':
            case '=':
            case '':
              return getLowestNextVersion(part.semver);
          }
        }

        return VERSION_ZERO;
      });

      return [descriptor, maxVersionsInRange.reduce((a, b) => (b.compare(a) === 1 ? b : a))];
    })
    .sort(([, aVersion], [, bVersion]) => bVersion.compareBuild(aVersion))
    .map(([descriptor]) => descriptor);
}

function getLowestNextVersion(version: SemVer) {
  if (version.build?.length) {
    return new SemVer(`${version.raw}0`);
  }
  if (version.prerelease?.length) {
    if (version.prerelease[version.prerelease.length - 1] === 0) {
      return new SemVer(`${version.raw.slice(0, -1)}1`);
    }
    return new SemVer(`${version.raw}0`);
  }

  return version.inc('prepatch');
}

export function cleanRange(range: string): string {
  return structUtils.parseRange(structUtils.convertToManifestRange(range)).selector;
}

const rangeMap = new Map<string, Range | null>();
export function getRange(range: string): Range | null {
  return miscUtils.getFactoryWithDefault(rangeMap, range, () => {
    const cleanedRange = cleanRange(range);

    if (validRange(cleanedRange)) {
      return new Range(cleanedRange);
    } else {
      return null;
    }
  });
}

const rangeStyles = new Map<RegExp, (version: string, copyFrom: string) => string | null>([
  [/^\^[^ <>=~]+$/, version => `^${version}`],
  [/^~[^ <>=~]+$/, version => `~${version}`],
  [/^>[^ <>=~]+$/, version => `>${version}`],
  [/^>=[^ <>=~]+$/, version => `>=${version}`],
  [
    /^>=.+<.+$/,
    (version, copyFrom) => {
      if (!valid(version)) {
        return null;
      }

      const range = getRange(copyFrom);
      if (range == null || range.set.length !== 1) {
        return null;
      }

      const [lowerBound, upperBound] = getBounds(range.set[0]);

      if (lowerBound?.operator !== '>=' || upperBound?.operator !== '<') {
        return null;
      }

      const lowerVersion = lowerBound.semver;
      const upperVersion = upperBound.semver;

      if (
        upperVersion.major === lowerVersion.major + 1 &&
        upperVersion.minor === 0 &&
        upperVersion.patch === 0
      ) {
        // >= 2.x.y < 3.0.0
        // -> map onto ^2.x.y
        return `^${version}`;
      }

      if (lowerVersion.major !== upperVersion.major) {
        return null;
      }

      if (upperVersion.minor === lowerVersion.minor + 1 && upperVersion.patch === 0) {
        // >= x.2.y < x.3.y
        // -> map onto ~x.2.y
        return `~${version}`;
      }

      {
        const actualLowerMajor = Math.trunc(lowerVersion.minor / 100);
        const expectedUpperVersion = 100 * (actualLowerMajor + 1);

        if (upperVersion.minor !== expectedUpperVersion || upperVersion.patch !== 0) {
          return null;
        }
      }

      const semverVersion = new SemVer(version);
      const major = Math.trunc(semverVersion.minor / 100);

      return `>=${version} <0.${major + 1}00.0`;
    },
  ],
]);

export function simplifyRange(rangeStr: string): string {
  const range = getRange(rangeStr);
  if (range == null) {
    return rangeStr;
  }

  const parts: string[] = [];

  for (const comp of range.set) {
    const [lowerBound, upperBound] = getBounds(comp);

    if (lowerBound?.operator !== '>=' || upperBound?.operator !== '<') {
      parts.push(comp.map(c => `${c.operator}${c.semver.format()}`).join(' '));
      continue;
    }

    const lowerVersion = lowerBound.semver;
    const upperVersion = upperBound.semver;

    if (
      upperVersion.major === lowerVersion.major + 1 &&
      upperVersion.minor === 0 &&
      upperVersion.patch === 0
    ) {
      // >= 2.x.y < 3.0.0
      // -> map onto ^2.x.y
      parts.push(`^${lowerVersion.format()}`);
      continue;
    }

    if (
      lowerVersion.major === upperVersion.major &&
      upperVersion.minor === lowerVersion.minor + 1 &&
      upperVersion.patch === 0
    ) {
      // >= x.2.y < x.3.y
      // -> map onto ~x.2.y
      parts.push(`~${lowerVersion.format()}`);
      continue;
    }

    parts.push(comp.map(c => `${c.operator}${c.semver.format()}`).join(' '));
  }

  return parts.join(' || ');
}

export function getUpdatableRange(version: string, copyFrom?: string): string {
  if (copyFrom == null) {
    return version;
  }

  if (valid(copyFrom)) {
    return version;
  }

  for (const [regex, updateRange] of rangeStyles) {
    if (regex.test(copyFrom.trim())) {
      const updatedRange = updateRange(version, copyFrom);

      if (updatedRange != null) {
        return updatedRange;
      }
    }
  }

  return version;
}
