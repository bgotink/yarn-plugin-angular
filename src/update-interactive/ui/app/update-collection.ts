import {DescriptorHash, Ident, IdentHash} from '@yarnpkg/core';

export type UpdateCollection = ReadonlyMap<
  IdentHash,
  {
    readonly ident: Ident;
    readonly migrate?: {
      readonly from: string;
      readonly to?: string;
    };
    readonly updates: ReadonlyMap<DescriptorHash, string>;
  }
>;
