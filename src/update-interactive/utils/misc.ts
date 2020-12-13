import {miscUtils as yarnMiscUtils} from '@yarnpkg/core';

export const miscUtils = {
  ...yarnMiscUtils,

  getRequired<K, V>(map: ReadonlyMap<K, V>, key: K): V {
    if (!map.has(key)) {
      throw new Error(`Key ${key} is required`);
    }

    return map.get(key) as V;
  },

  setWithAll<T>(set: ReadonlySet<T> | undefined, values: Iterable<T>): ReadonlySet<T> | undefined {
    return Array.from(values).reduce(miscUtils.setWith, set);
  },

  setWith<T>(set: ReadonlySet<T> | undefined, value: T): ReadonlySet<T> {
    if (set?.has(value)) {
      return set;
    }

    return new Set(set).add(value);
  },

  setEquals<T>(set: ReadonlySet<T> | undefined, other: ReadonlySet<T> | undefined): boolean {
    if ((set?.size ?? 0) !== (other?.size ?? 0)) {
      return false;
    }

    if (set == null || other == null) {
      return true;
    }

    for (const item of set) {
      if (!other.has(item)) {
        return false;
      }
    }

    return true;
  },

  mapWith<K, V>(map: ReadonlyMap<K, V> | undefined, key: K, value: V): ReadonlyMap<K, V> {
    if (map?.get(key) === value) {
      return map;
    }

    return new Map(map != null ? [...map, [key, value]] : [[key, value]]);
  },

  objectWith<O, K extends keyof O, V extends O[K]>(object: O, key: K, value: V): O {
    if (object[key] === value) {
      return object;
    }

    return {
      ...object,
      [key]: value,
    };
  },
};
