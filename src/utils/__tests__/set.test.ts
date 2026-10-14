import { describe, it, expect } from 'vitest';
import { removeFromSet, toggleInSet } from '../set';

describe('set helpers', () => {
  it('toggleInSet adds an absent value and removes a present one, without mutating', () => {
    const source = new Set([1]);
    expect([...toggleInSet(source, 2)]).toEqual([1, 2]);
    expect([...toggleInSet(source, 1)]).toEqual([]);
    expect([...source]).toEqual([1]);
  });

  it('removeFromSet removes a value and ignores an absent one, without mutating', () => {
    const source = new Set(['a', 'b']);
    expect([...removeFromSet(source, 'a')]).toEqual(['b']);
    expect([...removeFromSet(source, 'z')]).toEqual(['a', 'b']);
    expect([...source]).toEqual(['a', 'b']);
  });
});
