import {IdentHash, structUtils} from '@yarnpkg/core';
import {Range} from 'own-semver';

import {getRange} from '../../../utils';

import {AppState, AppEvent} from './interfaces';
import {getRangeForItem, isIncluded, isRequired} from './status';

export function reduceAppState(state: AppState, event: AppEvent): AppState {
  if ('range' in event) {
    const newItemMap = new Map(state.itemMap);
    const activeItem = newItemMap.get(event.ident)!;

    newItemMap.set(event.ident, {...activeItem, selectedRange: event.range, meta: undefined});

    for (const [ident, item] of newItemMap) {
      if (item.meta != null) {
        newItemMap.set(ident, {...item, meta: undefined});
      }
    }

    return updateFetchMetaQueue({
      ...state,

      itemMap: newItemMap,
    });
  } else if ('fetchSuggestionFor' in event) {
    if (state.fetchSuggestionQueue?.has(event.fetchSuggestionFor)) {
      return state;
    }

    const fetchSuggestionQueue = new Set(state.fetchSuggestionQueue);
    fetchSuggestionQueue.add(event.fetchSuggestionFor);

    return {
      ...state,
      fetchSuggestionQueue,
    };
  } else if ('suggestions' in event) {
    const fetchMetaQueue = new Set(state.fetchMetaQueue);
    const itemMap = new Map(state.itemMap);
    const fetchSuggestionQueue = new Set(state.fetchSuggestionQueue);

    for (const {ident, suggestions} of event.suggestions) {
      const item = state.itemMap.get(ident)!;

      fetchSuggestionQueue.delete(ident);
      itemMap.set(ident, {...item, suggestions, meta: undefined});

      if (item.meta != null) {
        fetchMetaQueue.add(ident);
      }
    }

    return {
      ...state,

      itemMap,
      fetchSuggestionQueue: fetchSuggestionQueue.size > 0 ? fetchSuggestionQueue : undefined,
      fetchMetaQueue:
        fetchMetaQueue.size === (state.fetchMetaQueue?.size ?? 0)
          ? state.fetchMetaQueue
          : fetchMetaQueue,
    };
  } else if ('manifests' in event) {
    const itemMap = new Map(state.itemMap);
    const fetchSuggestionQueue = new Set(state.fetchSuggestionQueue);

    function isKnown([ident]: readonly [IdentHash, unknown]): boolean {
      return itemMap.has(ident);
    }

    for (const {ident, manifest} of event.manifests) {
      const item = itemMap.get(ident)!;

      let includedPackages = new Map<IdentHash, Range | string>();
      let hasMigrations = false;

      if (manifest['ng-update']?.packageGroup != null) {
        const {packageGroup, migrations} = manifest['ng-update'];
        hasMigrations = typeof migrations === 'string';

        if (Array.isArray(packageGroup)) {
          const rangeString = getRangeForItem(state, ident);
          const range = getRange(rangeString) ?? rangeString;
          includedPackages = new Map(
            packageGroup
              .map(pkg => [structUtils.parseIdent(pkg).identHash, range] as const)
              .filter(isKnown),
          );
        } else if (packageGroup != null) {
          includedPackages = new Map(
            Object.entries(packageGroup)
              .map(([name, range]) => {
                return [structUtils.parseIdent(name).identHash, getRange(range) ?? range] as const;
              })
              .filter(isKnown),
          );
        }

        // Packages are included in their own package group
        includedPackages.delete(ident);
      }

      let peerDependencies = new Map<IdentHash, Range | string>();

      if (manifest.peerDependencies != null) {
        peerDependencies = new Map(
          Object.entries(manifest.peerDependencies)
            .map(([name, range]) => {
              return [structUtils.parseIdent(name).identHash, getRange(range) ?? range] as const;
            })
            .filter(isKnown),
        );
      }

      itemMap.set(ident, {
        ...item,
        meta: {
          hasMigrations,
          includedPackages,
          peerDependencies,
        },
      });

      for (const ident of [...includedPackages.keys(), ...peerDependencies.keys()]) {
        if (itemMap.get(ident)!.suggestions == null) {
          fetchSuggestionQueue.add(ident);
        }
      }
    }

    return updateFetchMetaQueue({
      ...state,
      itemMap,
      fetchSuggestionQueue:
        fetchSuggestionQueue.size !== (state.fetchSuggestionQueue?.size ?? 0)
          ? fetchSuggestionQueue
          : state.fetchSuggestionQueue,
    });
  }

  return state;
}

function updateFetchMetaQueue(state: AppState): AppState {
  let newItemAddedToQueue = false;
  const oldFetchMetaQueue = new Set(state.fetchMetaQueue);
  const fetchMetaQueue = new Set<IdentHash>();

  function addToQueue(ident: IdentHash) {
    fetchMetaQueue.add(ident);
    if (!oldFetchMetaQueue.has(ident)) {
      newItemAddedToQueue = true;
    }
  }

  for (const [ident, item] of state.itemMap) {
    if (item.meta != null) {
      continue;
    }

    if (item.selectedRange != null || isIncluded(state, ident) || isRequired(state, ident)) {
      addToQueue(ident);
    }
  }

  if (newItemAddedToQueue || fetchMetaQueue.size !== oldFetchMetaQueue.size) {
    return {...state, fetchMetaQueue: fetchMetaQueue.size > 0 ? fetchMetaQueue : undefined};
  }
  return state;
}
