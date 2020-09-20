declare module 'own-semver' {
  import {SemVer, Comparator as _Comparator} from '@types/semver';

  export * from 'semver';

  export declare class Comparator extends _Comparator {
    public static readonly ANY: SemVer;
  }
}
