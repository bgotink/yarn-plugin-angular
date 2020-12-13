import type {Descriptor, Ident, IdentHash} from '@yarnpkg/core';
import {Range} from 'own-semver';

export interface UpdatableItem {
  readonly identHash: IdentHash;
  readonly ident: Ident;

  readonly requestedDescriptors: readonly Descriptor[];
  readonly installedDescriptors: readonly Descriptor[];

  readonly label: string;
  readonly disabled?: boolean;

  readonly selectedRange?: string | null;
}

export interface SelectedOrRequiredInformation {
  readonly by: ReadonlyMap<IdentHash, Range | string>;

  readonly suggestions?: readonly string[];

  readonly selectedRange?: string;

  readonly validRange?: Range;

  readonly conflictingRanges: boolean;

  readonly hasMigrations: boolean;
}

export interface IncludedInformation {
  readonly by: Map<IdentHash, Range | string>;

  readonly validRange?: Range;
}

export interface AppState {
  readonly itemMap: ReadonlyMap<IdentHash, UpdatableItem>;
  readonly itemOrder: readonly IdentHash[];

  readonly suggestionsFetched: ReadonlySet<IdentHash>;
  readonly metaFetched: ReadonlySet<IdentHash>;

  readonly selectedAndRequired: ReadonlyMap<IdentHash, SelectedOrRequiredInformation>;
  readonly included: ReadonlyMap<IdentHash, IncludedInformation>;

  readonly metaFetching?: ReadonlySet<IdentHash>;
  readonly suggestionsFetching?: ReadonlySet<IdentHash>;
}

export type AppEvent =
  | {readonly ident: IdentHash; readonly range: string | null}
  | {readonly fetchSuggestionFor: IdentHash}
  | {readonly suggestions: readonly IdentHash[]}
  | {readonly manifests: readonly IdentHash[]};
