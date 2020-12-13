/* eslint-disable @typescript-eslint/no-unused-vars */

import {Configuration, Descriptor, IdentHash, structUtils} from '@yarnpkg/core';
import {Box, Text, useInput} from 'ink';
import type {Range} from 'own-semver';
import React, {useLayoutEffect, useRef, useState} from 'react';

import {FullScreenBox} from '../elements/full-screen-box';
import {Key} from '../elements/key';
import {KeyMatcher, useListInput} from '../hooks/use-list-input';

import {IdentListBox} from './ident-listbox';
import {InfoBox} from './info-box';
import {RangeSelector} from './range-selector';
import type {AppEvent, AppState, UpdatableItem} from './state';

interface ActiveList {
  readonly title: string;
  readonly disabled?: undefined;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
namespace ActiveList {
  export const Updatable: ActiveList = {title: 'Updatable items'};
  export const Selected: ActiveList = {title: 'Selected items'};
  export const Included: ActiveList = {title: 'Included items'};
}

const lists = [ActiveList.Updatable, ActiveList.Selected, ActiveList.Included];

interface ListState {
  readonly activeList: ActiveList;
  readonly activeIdents: ReadonlyMap<ActiveList, IdentHash>;
}

const minus: KeyMatcher = (char, key) => key.leftArrow;
const plus: KeyMatcher = (char, key) => key.rightArrow;

export function PageSelect({
  configuration,
  state,
  updateState,
  getSuggestions,
  goToNextPage,
}: {
  configuration: Configuration;
  state: AppState;
  updateState: React.Dispatch<AppEvent>;
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[];
  goToNextPage: () => void;
}): JSX.Element {
  const [listState, setListState] = useState<ListState>({
    activeList: ActiveList.Updatable,
    activeIdents: new Map(),
  });

  const items = state.itemOrder.map(id => state.itemMap.get(id)!);

  const itemLists = new Map([
    [
      ActiveList.Updatable,
      items.filter(item => !isSelectedOrRequired(item.identHash) && !isIncluded(item.identHash)),
    ],
    [ActiveList.Selected, items.filter(item => isSelectedOrRequired(item.identHash))],
    [ActiveList.Included, items.filter(item => isIncluded(item.identHash))],
  ]);

  const activeIdents = new Map(lists.map(list => [list, getActiveIdent(list)]));

  const activeIdent = activeIdents.get(listState.activeList) ?? null;
  const storedActiveIdent = useRef<IdentHash | null>(activeIdent);

  useLayoutEffect(() => {
    if (activeIdent === storedActiveIdent.current || storedActiveIdent.current == null) {
      return;
    }

    const activeList = lists.find(list =>
      itemLists.get(list)!.find(item => item.identHash === storedActiveIdent.current!),
    )!;

    setListState({
      activeIdents: new Map(listState.activeIdents).set(activeList, activeIdent!),
      activeList,
    });
  }, [activeIdent, storedActiveIdent.current]);

  useLayoutEffect(() => {
    if (
      activeIdent != null &&
      !state.suggestionsFetched.has(activeIdent) &&
      !state.suggestionsFetching?.has(activeIdent)
    ) {
      updateState({fetchSuggestionFor: activeIdent});
    }
  }, [activeIdent]);

  useListInput(listState.activeList, lists, {
    active: true,
    minus,
    plus,
    onChange: activeList => {
      storedActiveIdent.current = activeIdents.get(activeList) ?? null;
      setListState({
        ...listState,
        activeList,
      });
    },
  });

  useInput(
    (ch, key) => {
      if (key.return) {
        goToNextPage();
      }
    },
    {isActive: true},
  );

  function updateActiveItem(item: UpdatableItem) {
    storedActiveIdent.current = item.identHash;
    setListState({
      ...listState,
      activeIdents: new Map(listState.activeIdents).set(listState.activeList, item.identHash),
    });
  }

  function updateRange(range: string | null) {
    updateState({range, ident: activeIdent!});
  }

  return (
    <FullScreenBox minHeight={16} flexDirection="column">
      <Box minHeight={10} flexGrow={3}>
        {lists.map((list, i) => (
          <IdentListBox
            key={i}
            active={listState.activeList === list}
            title={list.title}
            items={itemLists.get(list)!}
            activeItem={tryGetItem(activeIdents.get(list) ?? null)}
            onChange={updateActiveItem}
          />
        ))}
      </Box>
      <Box minHeight={5} flexGrow={1} flexShrink={0} alignItems="stretch">
        <RangeSelector
          configuration={configuration}
          activeItem={tryGetItem(activeIdent)}
          state={state}
          inclusion={activeIdent && state.included.get(activeIdent)}
          selectionOrRequirement={activeIdent && state.selectedAndRequired.get(activeIdent)}
          getSuggestions={getSuggestions}
          onChange={updateRange}
          flexGrow={1}
          flexBasis={0}
        />
        <InfoBox
          flexGrow={1}
          flexBasis={0}
          activeItem={tryGetItem(activeIdent)}
          state={state}
          configuration={configuration}
        />
      </Box>
      <Box flexBasis="auto" flexGrow={0} flexShrink={0}>
        <Text>
          Use the <Key>left</Key>/<Key>right</Key> to change the active list and <Key>up</Key>/
          <Key>down</Key> arrow keys to change the active item. Hit <Key>enter</Key> to commit your
          selection, or <Key>ctrl-c</Key> to quit.
        </Text>
      </Box>
    </FullScreenBox>
  );

  function tryGetItem(ident: IdentHash | null) {
    return ident != null ? state.itemMap.get(ident)! : null;
  }

  function getActiveIdent(list: ActiveList) {
    const itemList = itemLists.get(list)!;
    if (itemList.length === 0) {
      return null;
    }

    const start = listState.activeIdents.get(list);

    if (start == null) {
      return itemList[0].identHash;
    }

    const name = structUtils.stringifyIdent(state.itemMap.get(start)!.ident);

    const firstIdxAfterName = itemList.findIndex(
      item => structUtils.stringifyIdent(item.ident) > name,
    );
    let idx;
    switch (firstIdxAfterName) {
      case -1:
        idx = itemList.length - 1;
        break;
      case 0:
        idx = 0;
        break;
      default:
        idx = firstIdxAfterName - 1;
    }

    return itemList[idx].identHash;
  }

  function isSelected(ident: IdentHash) {
    return state.itemMap.get(ident)!.selectedRange != null;
  }

  function isSelectedOrRequired(ident: IdentHash) {
    return state.selectedAndRequired.has(ident) && !isIncluded(ident);
  }

  function isIncluded(ident: IdentHash) {
    return !isSelected(ident) && state.included.has(ident);
  }
}
