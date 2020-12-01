/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, Descriptor, Project, structUtils} from '@yarnpkg/core';
import {useApp} from 'ink';
import React, {useLayoutEffect, useState} from 'react';

import {UpdatableManifest} from '../../utils';

import {PageConfirm} from './page-confirm';
import {PageSelect} from './page-select';
import {getRangeForItem, useAppState} from './state';
import {UpdateCollection} from './update-collection';

const enum ActivePage {
  Select,
  Confirm,
}

function isntNull<T>(value: T): value is NonNullable<T> {
  return value != null;
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

  useLayoutEffect(() => {
    if (state.fetchSuggestionQueue == null) {
      return;
    }

    let active = true;

    Promise.all(
      Array.from(state.fetchSuggestionQueue, ident =>
        fetchSuggestions(state.itemMap.get(ident)!.requestedDescriptors[0])
          .catch(() => [])
          .then(suggestions => ({ident, suggestions})),
      ),
    ).then(suggestions => {
      if (active) {
        updateState({suggestions});
      }
    });

    return () => {
      active = false;
    };
  }, [state.fetchSuggestionQueue]);

  useLayoutEffect(() => {
    let active = true;

    if (state.fetchMetaQueue == null) {
      return;
    }

    Promise.all(
      Array.from(state.fetchMetaQueue, ident => {
        const item = state.itemMap.get(ident)!;

        if (item.suggestions == null) {
          return null;
        }

        return fetchDescriptorManifest(
          structUtils.makeDescriptor(item.ident, getRangeForItem(state, ident)),
        )
          .catch(() => null)
          .then(manifest => ({
            ident,
            manifest: manifest ?? {
              name: structUtils.stringifyIdent(state.itemMap.get(ident)!.ident),
              version: '0.0.0',
            },
          }));
      }),
    ).then(manifests => {
      if (active) {
        updateState({manifests: manifests.filter(isntNull)});
      }
    });

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
