import {Descriptor, IdentHash, structUtils} from '@yarnpkg/core';
import {Range, subset} from 'own-semver';

import {
  cleanRange,
  getIntersection,
  getRange,
  UpdatableManifest,
  miscUtils,
  concatIterables,
} from '../../../utils';

import type {AppState} from './interfaces';

interface SelectedOrRequiredInformation {
  by: Map<IdentHash, Range | string>;

  suggestions?: string[];

  selectedRange?: string;

  validRange?: Range;

  conflictingRanges: boolean;

  hasMigrations: boolean;
}

interface IncludedInformation {
  by: Map<IdentHash, Range | string>;

  validRange?: Range;
}

interface AppStateSelection {
  selectedAndRequired: Map<IdentHash, SelectedOrRequiredInformation>;

  included: Map<IdentHash, IncludedInformation>;

  metaFetching: ReadonlySet<IdentHash> | undefined;
}

export function updateSelection(
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[],
  getDescriptorMeta: (descriptor: Descriptor) => UpdatableManifest,
  state: AppState,
): AppState {
  const requiresSuggestions = new Set<IdentHash>();
  const appSelection: AppStateSelection = {
    selectedAndRequired: new Map(),
    included: new Map(),
    metaFetching: undefined,
  };

  const {selectedAndRequired, included} = appSelection;
  const metaFetching = new Set<IdentHash>();

  // Start with all packages that have a user-selected range

  const initialPackages = new Set<IdentHash>();

  for (const [ident, item] of Array.from(state.itemMap).filter(
    ([, {selectedRange}]) => selectedRange != null,
  )) {
    initialPackages.add(ident);
    getSelection(ident).selectedRange = item.selectedRange!;
  }

  // Collect all packages

  // We do this in a multipass process, where we expand the tree based on what we've learned

  let queue = new Set(initialPackages);
  const alreadyOkay = new Set<IdentHash>();
  let iteration = 0;
  while (queue.size > 0) {
    if (++iteration > 20) {
      // We may be in an infinite loop... abort, abort
      break;
    }

    const oldQueue = queue;
    queue = new Set();

    for (const ident of oldQueue) {
      const item = state.itemMap.get(ident)!;
      const selection = getSelection(ident);
      const inclusion = included.get(ident);

      metaFetching.delete(ident);
      alreadyOkay.delete(ident);

      // If the item doens't have a user-selected range, compute the range:
      if (item.selectedRange == null) {
        let range: Range | null | undefined;
        if (inclusion?.by.size) {
          range = getCombinedRange(inclusion.by.values());
        } else if (selection.by.size) {
          range = getCombinedRange(selection.by.values());
        }

        if (range === null) {
          selection.conflictingRanges = true;
          selection.validRange = undefined;

          continue;
        }

        selection.conflictingRanges = false;

        if (range === undefined || subset(cleanRange(item.requestedDescriptors[0].range), range)) {
          // The current version matches whatever is required and/or included
          // -> We don't have to update this package

          selection.selectedRange = undefined;
          selection.suggestions = undefined;
          selection.validRange = undefined;

          alreadyOkay.add(ident);
        } else {
          if (!state.suggestionsFetched.has(ident)) {
            requiresSuggestions.add(ident);
            continue;
          }

          if (range.format() === selection.validRange?.format()) {
            // This ident was already processed and the range didn't change, no need to continue
            // processing
            continue;
          }

          const suggestions = getSuggestions(item.requestedDescriptors[0], range);

          selection.suggestions = Array.from(suggestions);
          selection.selectedRange = suggestions[suggestions.length - 1];
          selection.validRange = range;

          alreadyOkay.delete(ident);
        }
      }

      if (selection.selectedRange == null) {
        for (const [i, {by}] of concatIterables(included, selectedAndRequired)) {
          if (by.has(ident)) {
            by.delete(ident);
            queue.add(i);
          }
        }

        continue;
      }

      if (!state.metaFetched.has(ident)) {
        metaFetching.add(ident);
        continue;
      }

      const meta = getDescriptorMeta(
        structUtils.makeDescriptor(item.ident, selection.selectedRange),
      );

      if (meta.peerDependencies != null) {
        const peerDependencies = toIdentMap(Object.entries(meta.peerDependencies));

        for (const [peerDependency, rangeStr] of peerDependencies) {
          if (!state.itemMap.has(peerDependency)) {
            continue;
          }

          const range = getRange(rangeStr) || rangeStr;
          const {by} = getSelection(peerDependency);

          if (by.get(ident) !== range) {
            by.set(ident, range);
            queue.add(peerDependency);
          }
        }

        for (const [i, {by}] of selectedAndRequired) {
          if (!peerDependencies.has(i) && by.has(ident)) {
            by.delete(ident);
            queue.add(i);
          }
        }
      }

      selection.hasMigrations = meta['ng-update']?.migrations != null;

      if (meta['ng-update']?.packageGroup != null) {
        const packageGroup = toIdentMap(
          Array.isArray(meta['ng-update'].packageGroup)
            ? meta['ng-update'].packageGroup.map(name => [name, meta.version])
            : Object.entries(meta['ng-update'].packageGroup),
        );

        for (const [included, rangeStr] of packageGroup) {
          if (included === ident || !state.itemMap.has(included)) {
            continue;
          }

          const range = getRange(rangeStr) ?? rangeStr;
          const {by} = getInclusion(included);

          if (by.get(ident) !== range) {
            getInclusion(included).by.set(ident, getRange(rangeStr) ?? rangeStr);
            queue.add(included);
          }
        }

        for (const [i, {by}] of included) {
          if (!packageGroup.has(i) && by.has(ident)) {
            by.delete(ident);
            queue.add(i);
          }
        }
      }
    }
  }

  // Remove packages that don't have to be updated

  for (const ident of alreadyOkay) {
    included.delete(ident);
    selectedAndRequired.delete(ident);
  }

  for (const [ident, {by}] of included) {
    if (by.size === 0) {
      included.delete(ident);
    }
  }

  for (const [ident, {by}] of selectedAndRequired) {
    if (by.size === 0 && !included.has(ident) && !state.itemMap.get(ident)!.selectedRange) {
      selectedAndRequired.delete(ident);
    }
  }

  // Prevent loops from blocking the user from unselecting a package

  for (const ident of initialPackages) {
    // Packages that the user has selected are not also included, this always points to a loop, e.g.
    // because @angular/core includes @angular/common which includes @angular/core.
    included.delete(ident);

    // Strip loops from inclusions/requirements to prevent the scenario where you select @angular/core
    // which includes @angular/common which has a peer dependency on @angular/core blocks the user
    // from unselecting @angular/core
    const selection = selectedAndRequired.get(ident)!;
    let changed = false;
    for (const ident of selection.by.keys()) {
      const transitiveDependants = new Set([ident]);
      let keep = false;

      for (const dependant of transitiveDependants) {
        if (ident !== dependant && initialPackages.has(dependant)) {
          keep = true;
          break;
        }

        for (const transitive of concatIterables(
          selectedAndRequired.get(dependant)?.by.keys() ?? [],
          included.get(dependant)?.by.keys() ?? [],
        )) {
          transitiveDependants.add(transitive);
        }
      }

      if (!keep) {
        changed = true;
        selection.by.delete(ident);
      }
    }

    if (changed) {
      selection.validRange =
        selection.by.size > 0 ? getCombinedRange(selection.by.values()) ?? undefined : undefined;
    }
  }

  // Fill in the valid inclusion ranges

  for (const inclusion of included.values()) {
    inclusion.validRange = getCombinedRange(inclusion.by.values()) ?? undefined;
  }

  // Ensure set content equality leads to instance equality

  if (miscUtils.setEquals(state.metaFetching, metaFetching)) {
    appSelection.metaFetching = state.metaFetching;
  } else if (metaFetching.size > 0) {
    appSelection.metaFetching = metaFetching;
  }

  return {
    ...state,
    ...appSelection,

    migrationsDisabled: miscUtils.setIntersect(
      state.migrationsDisabled,
      new Set(selectedAndRequired.keys()),
    ),
    suggestionsFetching: miscUtils.setWithAll(state.suggestionsFetching, requiresSuggestions),
  };

  function getSelection(ident: IdentHash): SelectedOrRequiredInformation {
    return miscUtils.getFactoryWithDefault(selectedAndRequired, ident, () => {
      return {
        by: new Map(),
        conflictingRanges: false,
        hasMigrations: false,
        selectedRange: undefined,
        suggestions: undefined,
        validRange: undefined,
      };
    });
  }

  function getInclusion(ident: IdentHash): IncludedInformation {
    return miscUtils.getFactoryWithDefault(included, ident, () => {
      return {
        by: new Map(),
        validRange: undefined,
      };
    });
  }
}

function getCombinedRange(rangesOrStrings: Iterable<Range | string>) {
  const ranges = Array.from(rangesOrStrings).filter((r): r is Range => typeof r !== 'string');

  if (ranges.length === 0) {
    return null;
  }

  return ranges.reduce(
    // @ts-expect-error Types of Array.prototype.reduce incorrectly don't allow for this usage
    (range: Range | null, current: Range) => range && getIntersection(range, current),
  ) as Range | null;
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

function toIdentMap(values: Iterable<readonly [string, string]>): Map<IdentHash, string> {
  return new Map(
    Array.from(values, ([name, range]) => [structUtils.parseIdent(name).identHash, range]),
  );
}
