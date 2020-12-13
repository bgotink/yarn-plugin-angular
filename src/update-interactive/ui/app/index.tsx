/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, Descriptor, Ident, Project} from '@yarnpkg/core';
import {useApp} from 'ink';
import React, {useLayoutEffect, useState} from 'react';
import {Range} from 'own-semver';

import {UpdatableManifest} from '../../utils';

import {PageConfirm} from './page-confirm';
import {PageSelect} from './page-select';
import {useAppState} from './state';
import {UpdateCollection} from './update-collection';

const enum ActivePage {
  Select,
  Confirm,
}

export {UpdateCollection};

export function App({
  configuration,
  project,
  dependencies,
  fetchSuggestions,
  fetchMeta,
  getSuggestions,
  getDescriptorMeta,
  commitUpdateCollection,
}: {
  configuration: Configuration;
  project: Project;
  dependencies: readonly {readonly requested: Descriptor; readonly installed?: Descriptor}[];
  fetchSuggestions: (ident: Ident) => Promise<void>;
  fetchMeta: (ident: Ident) => Promise<void>;
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[];
  getDescriptorMeta: (descriptor: Descriptor) => UpdatableManifest;
  commitUpdateCollection: (collection: UpdateCollection) => void;
}): JSX.Element {
  const [state, updateState] = useAppState(
    configuration,
    dependencies,
    getSuggestions,
    getDescriptorMeta,
  );

  useLayoutEffect(() => {
    if (state.suggestionsFetching == null) {
      return;
    }

    let active = true;

    Promise.all(
      Array.from(state.suggestionsFetching, ident =>
        fetchSuggestions(state.itemMap.get(ident)!.ident).then(
          () => ident,
          () => ident,
        ),
      ),
    ).then(suggestions => {
      if (active) {
        updateState({suggestions});
      }
    });

    return () => {
      active = false;
    };
  }, [state.suggestionsFetching]);

  useLayoutEffect(() => {
    let active = true;

    if (state.metaFetching == null) {
      return;
    }

    Promise.all(
      Array.from(state.metaFetching, ident =>
        fetchMeta(state.itemMap.get(ident)!.ident).then(
          () => ident,
          () => ident,
        ),
      ),
    ).then(manifests => {
      if (active) {
        updateState({manifests});
      }
    });

    return () => {
      active = false;
    };
  }, [state.metaFetching]);

  const [activePage, setActivePage] = useState<ActivePage>(ActivePage.Select);
  const {exit} = useApp();

  switch (activePage) {
    case ActivePage.Select: {
      return (
        <PageSelect
          configuration={configuration}
          state={state}
          getSuggestions={getSuggestions}
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
