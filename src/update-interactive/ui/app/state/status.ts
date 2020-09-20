import {IdentHash, miscUtils} from '@yarnpkg/core';
import assert from 'assert';
import {intersects, Range, valid} from 'own-semver';

import {getIntersection, getRange} from '../../../utils';

import {AppState, UpdatableItem} from './interfaces';

const itemStatusCache = new WeakMap<
  ReadonlyMap<IdentHash, UpdatableItem>,
  {
    includedBy: Map<IdentHash, {ident: IdentHash; range: Range | string}[]>;
    requiredBy: Map<IdentHash, {ident: IdentHash; range: Range | string}[]>;
  }
>();

type FakeStatusCacheType = typeof itemStatusCache extends WeakMap<infer T, infer U>
  ? Map<T, U>
  : never;

function getItemStatus(state: Pick<AppState, 'itemMap'>, ident: IdentHash) {
  const statuses = miscUtils.getFactoryWithDefault(
    itemStatusCache as FakeStatusCacheType,
    state.itemMap,
    () => {
      const includedBy = new Map<IdentHash, {ident: IdentHash; range: Range | string}[]>();
      const requiredBy = new Map<IdentHash, {ident: IdentHash; range: Range | string}[]>();

      {
        const queue = Array.from(state.itemMap)
          .filter(([, item]) => item.selectedRange != null)
          .map(([ident]) => [ident, new Set<IdentHash>() as ReadonlySet<IdentHash>] as const);
        const seen = new Set<IdentHash>();
        // dit moet wat slimmer
        // nu steken we hier blindelings alle inclusions en peer dependencies weg, maar dit zou intelligenter moeten
        // zodat er geen cycles worden toegevoegd
        // want het is achteraf heel moeilijk om die cycles te fixen eens ze er in zitten

        while (queue.length > 0) {
          const [current, includers] = queue.shift()!;
          if (seen.has(current)) {
            continue;
          }
          seen.add(current);

          const currentItem = state.itemMap.get(current);
          if (currentItem?.meta == null) {
            continue;
          }

          for (const [includedIdent, range] of currentItem.meta.includedPackages) {
            if (includers.has(includedIdent)) {
              // loop in the dependencies, break it
              continue;
            }

            miscUtils.getArrayWithDefault(includedBy, includedIdent).push({ident: current, range});
            queue.push([includedIdent, new Set([...includers, current])]);
          }

          for (const [peerDependencyIdent, range] of currentItem.meta.peerDependencies) {
            if (includers.has(peerDependencyIdent)) {
              // loop in the dependencies, break it
              continue;
            }

            if (typeof range !== 'string') {
              const peerDependencyItem = state.itemMap.get(peerDependencyIdent)!;
              const existingRanges = peerDependencyItem.requestedDescriptors.map(({range}) =>
                getRange(range),
              );

              if (
                existingRanges.every(
                  r =>
                    r != null &&
                    (valid(r.raw)
                      ? range.test(r.raw) // r is a single version
                      : r.format() === getIntersection(r, range)?.format()), // r is a range
                )
              ) {
                // all installed ranges comply with the peer dependency requirement
                // -> ignore the requirement
                continue;
              }
            }

            queue.push([peerDependencyIdent, new Set([...includers, current])]);
            miscUtils
              .getArrayWithDefault(requiredBy, peerDependencyIdent)
              .push({ident: current, range});
          }
        }
      }

      for (const [includedIdent, includers] of includedBy) {
        // Packages that are included don't need to be marked required
        requiredBy.delete(includedIdent);

        // Try to find the cause of the inclusion and only show that cause, otherwise the entire
        // package group shows up as includers
        const filteredIncluders = includers.filter(({ident}) => !includedBy.has(ident));
        if (filteredIncluders.length > 0) {
          includedBy.set(includedIdent, filteredIncluders);
        }
      }

      return {includedBy, requiredBy};
    },
  );

  return {
    includedBy: statuses.includedBy.get(ident),
    requiredBy: statuses.requiredBy.get(ident),
  };
}

export function isSelected(state: Pick<AppState, 'itemMap'>, ident: IdentHash): boolean {
  return state.itemMap.get(ident)!.selectedRange != null;
}

/* eslint-disable @typescript-eslint/explicit-module-boundary-types */

export function getIncluders(state: Pick<AppState, 'itemMap'>, ident: IdentHash) {
  return getItemStatus(state, ident).includedBy;
}

export function isIncluded(state: Pick<AppState, 'itemMap'>, ident: IdentHash): boolean {
  return !isSelected(state, ident) && getIncluders(state, ident) != null;
}

export function getRequirers(state: Pick<AppState, 'itemMap'>, ident: IdentHash) {
  return getItemStatus(state, ident).requiredBy;
}

export function getRequiredRange(state: Pick<AppState, 'itemMap'>, ident: IdentHash): Range | null {
  return (
    getRequirers(state, ident)
      ?.map(req => req.range)
      .filter((r): r is Range => typeof r !== 'string')
      .reduce((previous, current) =>
        previous != null ? getIntersection(previous, current)! : null!,
      ) ?? null
  );
}

export function isRequired(state: Pick<AppState, 'itemMap'>, ident: IdentHash): boolean {
  return (
    !(isSelected(state, ident) || isIncluded(state, ident)) && getRequirers(state, ident) != null
  );
}

export function getRangeForItem(state: Pick<AppState, 'itemMap'>, ident: IdentHash): string {
  const item = state.itemMap.get(ident)!;
  let range: string | null | undefined;

  const requiredRange = getRequiredRange(state, ident);
  if (requiredRange != null && item.suggestions != null) {
    range = item.suggestions.find(r => intersects(r, requiredRange));
  }

  if (range == null) {
    range = item.selectedRange;
  }

  if (range == null) {
    const includers = getIncluders(state, ident);
    if (includers != null) {
      range = rangeToString(includers[0].range);
    }
  }

  if (range == null) {
    const requirers = getRequirers(state, ident);
    if (requirers != null) {
      range = rangeToString(requirers[0].range);
    }
  }

  assert(
    range != null,
    `Failed to get range for ${item.label} - selected range ${
      item.selectedRange
    } - has includers? ${getIncluders(state, ident) != null} - has requirers? ${
      getRequirers(state, ident) != null
    }`,
  );

  return range;
}

export function rangeToString(range: Range | string, pretty = false): string {
  if (typeof range === 'string') {
    return range;
  }

  if (pretty) {
    return range.raw;
  }
  return range.format();
}
