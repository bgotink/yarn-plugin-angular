import {Configuration, Descriptor, IdentHash, miscUtils, structUtils} from '@yarnpkg/core';
import {Range} from 'own-semver';
import {Dispatch, useCallback, useReducer} from 'react';

import {sortByMaxVersion, UpdatableManifest} from '../../../utils';

import type {AppState, AppEvent, UpdatableItem} from './interfaces';
import {createAppStateReducer} from './reducer';

function initAppState(itemArray: UpdatableItem[]) {
  const itemOrder = itemArray.map(item => item.identHash);
  const items = new Map(itemArray.map(item => [item.identHash, item]));

  return (): AppState => ({
    itemMap: items,
    itemOrder,

    migrationsDisabled: new Set(),

    metaFetched: new Set(),
    suggestionsFetched: new Set(),

    included: new Map(),
    selectedAndRequired: new Map(),
  });
}

function groupIdents(
  configuration: Configuration,
  descriptors: readonly {readonly requested: Descriptor; readonly installed?: Descriptor}[],
): UpdatableItem[] {
  const identMap = new Map<IdentHash, {requested: Descriptor; installed?: Descriptor}[]>();

  for (const {requested, installed} of descriptors) {
    miscUtils.getArrayWithDefault(identMap, requested.identHash).push({requested, installed});
  }

  const sortedDescriptors = miscUtils.sortMap(identMap.values(), ([{requested}]) =>
    structUtils.stringifyIdent(requested),
  );

  return sortedDescriptors.map(descriptors => {
    const requestedDescriptors = sortByMaxVersion(
      descriptors.map(descriptor => descriptor.requested),
    );
    const installedDescriptors = sortByMaxVersion(
      descriptors
        .map(descriptor => descriptor.installed)
        .filter((descriptor): descriptor is Descriptor => descriptor != null),
    );

    const ident = structUtils.convertToIdent(descriptors[0].requested);

    // TODO: disable if multiple versions are being used? Would be more correct with wrt migrations to run
    return {
      identHash: ident.identHash,
      ident,

      requestedDescriptors,
      installedDescriptors,

      label: structUtils.prettyIdent(configuration, ident),
    };
  });
}

export function useAppState(
  configuration: Configuration,
  dependencies: readonly {readonly requested: Descriptor; readonly installed?: Descriptor}[],
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[],
  getDescriptorMeta: (descriptor: Descriptor) => UpdatableManifest,
): [AppState, Dispatch<AppEvent>] {
  return useReducer(
    useCallback(createAppStateReducer(getSuggestions, getDescriptorMeta), [
      getSuggestions,
      getDescriptorMeta,
    ]),
    undefined,
    initAppState(groupIdents(configuration, dependencies)),
  );
}
