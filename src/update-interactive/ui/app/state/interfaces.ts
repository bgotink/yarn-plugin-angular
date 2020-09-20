import {Descriptor, Ident, IdentHash} from '@yarnpkg/core';
import {Range} from 'own-semver';

import {UpdatableManifest} from '../../../utils';

export interface UpdatableItem {
  readonly identHash: IdentHash;
  readonly ident: Ident;

  readonly requestedDescriptors: readonly Descriptor[];
  readonly installedDescriptors: readonly Descriptor[];

  readonly label: string;
  readonly disabled?: boolean;

  readonly selectedRange?: string | null;

  readonly suggestions?: string[];

  readonly meta?: {
    readonly hasMigrations: boolean;
    readonly peerDependencies: ReadonlyMap<IdentHash, Range | string>;
    readonly includedPackages: ReadonlyMap<IdentHash, Range | string>;
  };
}

export interface AppState {
  readonly itemMap: ReadonlyMap<IdentHash, UpdatableItem>;
  readonly itemOrder: readonly IdentHash[];

  readonly fetchMetaQueue?: ReadonlySet<IdentHash>;
  readonly fetchSuggestionQueue?: ReadonlySet<IdentHash>;
}

export type AppEvent =
  | {ident: IdentHash; range: string | null}
  | {fetchSuggestionFor: IdentHash}
  | {ident: IdentHash; suggestions: string[]}
  | {ident: IdentHash; manifest: UpdatableManifest};
