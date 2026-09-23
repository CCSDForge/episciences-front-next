/** Immutable Set helpers for filter selections held in React state. */

/** Adds `value` when absent, removes it otherwise, always returning a new Set. */
export function toggleInSet<T>(source: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(source);
  if (next.has(value)) {
    next.delete(value);
  } else {
    next.add(value);
  }
  return next;
}

export function removeFromSet<T>(source: ReadonlySet<T>, value: T): Set<T> {
  const next = new Set(source);
  next.delete(value);
  return next;
}
