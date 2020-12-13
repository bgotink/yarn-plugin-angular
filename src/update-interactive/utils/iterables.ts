export function areArraysEqual<T>(a: T[], b: T[]): boolean {
  const {length} = a;
  if (length !== b.length) {
    return false;
  }

  for (let i = 0; i < length; i++) {
    if (a[i] !== b[i]) {
      return false;
    }
  }

  return true;
}

export function* concatIterables<T>(a: Iterable<T>, b: Iterable<T>) {
  yield* a;
  yield* b;
}

export function addAllToSet<T>(a: ReadonlySet<T>, b: Iterable<T>): Set<T> {
  return new Set(concatIterables(a, b));
}
