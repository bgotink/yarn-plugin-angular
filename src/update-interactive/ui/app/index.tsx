/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, Descriptor, Project, structUtils} from '@yarnpkg/core';
import {useApp} from 'ink';
import React, {useEffect, useState} from 'react';

import {UpdatableManifest} from '../../utils';

import {PageConfirm} from './page-confirm';
import {PageSelect} from './page-select';
import {getRangeForItem, useAppState} from './state';
import {UpdateCollection} from './update-collection';

const enum ActivePage {
  Select,
  Confirm,
}

export function App({
  configuration,
  project,
  dependencies,
  fetchSuggestions,
  fetchDescriptorManifest,
  commitUpdateCollection,
}: {
  configuration: Configuration;
  project: Project;
  dependencies: {requested: Descriptor; installed?: Descriptor}[];
  fetchDescriptorManifest: (descriptor: Descriptor) => Promise<UpdatableManifest | null>;
  fetchSuggestions: (descriptor: Descriptor) => Promise<string[]>;
  commitUpdateCollection: (collection: UpdateCollection) => void;
}): JSX.Element {
  const [state, updateState] = useAppState(configuration, dependencies);

  useEffect(() => {
    if (state.fetchSuggestionQueue == null) {
      return;
    }

    let active = true;

    for (const ident of state.fetchSuggestionQueue) {
      fetchSuggestions(state.itemMap.get(ident)!.requestedDescriptors[0]).then(
        suggestions => {
          if (active) {
            updateState({ident, suggestions});
          }
        },
        () => {
          if (active) {
            updateState({ident, suggestions: []});
          }
        },
      );
    }

    return () => {
      active = false;
    };
  }, [state.fetchSuggestionQueue]);

  useEffect(() => {
    let active = true;

    if (state.fetchMetaQueue == null) {
      return;
    }

    for (const ident of state.fetchMetaQueue) {
      const item = state.itemMap.get(ident)!;

      if (item.suggestions == null) {
        continue;
      }

      fetchDescriptorManifest(structUtils.makeDescriptor(item.ident, getRangeForItem(state, ident)))
        .then(manifest => {
          if (manifest == null) {
            throw new Error('caught later on');
          }

          if (active) {
            updateState({manifest, ident});
          }
        })
        .catch(() => {
          if (active) {
            updateState({
              ident,
              manifest: {
                name: structUtils.stringifyIdent(state.itemMap.get(ident)!.ident),
                version: '0.0.0',
              },
            });
          }
        });
    }

    return () => {
      active = false;
    };
  }, [state.fetchMetaQueue, state.fetchSuggestionQueue]);

  const [activePage, setActivePage] = useState<ActivePage>(ActivePage.Select);
  const {exit} = useApp();

  switch (activePage) {
    case ActivePage.Select: {
      return (
        <PageSelect
          configuration={configuration}
          state={state}
          updateState={updateState}
          goToNextPage={() => setActivePage(ActivePage.Confirm)}
        />
      );
    }
    case ActivePage.Confirm: {
      return (
        <PageConfirm
          configuration={configuration}
          project={project}
          state={state}
          goToPreviousPage={() => setActivePage(ActivePage.Select)}
          goToNextPage={collection => {
            commitUpdateCollection(collection);
            exit();
          }}
        />
      );
    }
  }
}
