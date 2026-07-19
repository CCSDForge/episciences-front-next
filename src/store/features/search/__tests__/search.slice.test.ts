import { describe, it, expect } from 'vitest';
import reducer, { setSearch } from '../search.slice';

describe('search.slice', () => {
  const initialState = { results: { data: [], totalItems: 0 } };

  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('setSearch stores the search term', () => {
    const state = reducer(initialState, setSearch('graph theory'));
    expect(state.search).toBe('graph theory');
  });
});
