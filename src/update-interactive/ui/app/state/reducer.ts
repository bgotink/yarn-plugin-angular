import {Descriptor} from '@yarnpkg/core';
import {Range} from 'own-semver';

import {addAllToSet, miscUtils, UpdatableManifest} from '../../../utils';

import type {AppState, AppEvent} from './interfaces';
import {updateSelection} from './selection';

export function createAppStateReducer(
  getSuggestions: (descriptor: Descriptor, range: Range | null) => readonly string[],
  getDescriptorMeta: (descriptor: Descriptor) => UpdatableManifest,
) {
  return function reduceAppState(state: AppState, event: AppEvent): AppState {
    if ('range' in event) {
      return updateSelection(getSuggestions, getDescriptorMeta, {
        ...state,

        itemMap: miscUtils.mapWith(state.itemMap, event.ident, {
          ...miscUtils.getRequired(state.itemMap, event.ident),

          selectedRange: event.range,
        }),
      });
    } else if ('fetchSuggestionFor' in event) {
      if (state.suggestionsFetched.has(event.fetchSuggestionFor)) {
        return state;
      }

      return miscUtils.objectWith(
        state,
        'suggestionsFetching',
        miscUtils.setWith(state.suggestionsFetching, event.fetchSuggestionFor),
      );
    } else if ('suggestions' in event) {
      const suggestionsFetched = addAllToSet(state.suggestionsFetched, event.suggestions);

      const suggestionsFetching = new Set(state.suggestionsFetching);
      for (const ident of event.suggestions) {
        suggestionsFetching.delete(ident);
      }

      return updateSelection(getSuggestions, getDescriptorMeta, {
        ...state,

        suggestionsFetched,
        suggestionsFetching: suggestionsFetching.size > 0 ? suggestionsFetching : undefined,
      });
    } else if ('manifests' in event) {
      const metaFetched = addAllToSet(state.metaFetched, event.manifests);

      const metaFetching = new Set(state.metaFetching);
      for (const ident of event.manifests) {
        metaFetching.delete(ident);
      }

      return updateSelection(getSuggestions, getDescriptorMeta, {
        ...state,

        metaFetched,
        metaFetching: metaFetching.size > 0 ? metaFetching : undefined,
      });
    }

    return state;
  };
}
