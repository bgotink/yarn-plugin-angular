import {Configuration, Descriptor, IdentHash, miscUtils, structUtils} from '@yarnpkg/core';
import {Dispatch, useReducer} from 'react';

import {sortByMaxVersion} from '../../../utils';

import {AppState, AppEvent, UpdatableItem} from './interfaces';
import {reduceAppState} from './reducer';

function initAppState(itemArray: UpdatableItem[]) {
  const itemOrder = itemArray.map(item => item.identHash);
  const items = new Map(itemArray.map(item => [item.identHash, item]));

  return (): AppState => ({
    itemMap: items,
    itemOrder,
  });
}

function groupIdents(
  configuration: Configuration,
  descriptors: {requested: Descriptor; installed?: Descriptor}[],
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
  dependencies: {requested: Descriptor; installed?: Descriptor}[],
): [AppState, Dispatch<AppEvent>] {
  return useReducer(
    reduceAppState,
    undefined,
    initAppState(groupIdents(configuration, dependencies)),
  );
}
