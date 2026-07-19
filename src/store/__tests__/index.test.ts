import { describe, it, expect } from 'vitest';
import store, { persistor, useAppDispatch, useAppSelector } from '../index';
import { setSearch } from '../features/search/search.slice';

describe('store/index', () => {
  it('creates a store with the expected reducer slices', () => {
    const state = store.getState() as Record<string, unknown>;
    expect(state.journalReducer).toBeDefined();
    expect(state.searchReducer).toBeDefined();
    expect(state.i18nReducer).toBeDefined();
  });

  it('dispatches actions through the real store', () => {
    store.dispatch(setSearch('graph theory'));
    expect((store.getState() as any).searchReducer.search).toBe('graph theory');
  });

  it('creates a persistor on the client (window is defined in tests)', () => {
    expect(persistor).not.toBeNull();
  });

  it('exposes typed dispatch/selector hooks', () => {
    expect(typeof useAppDispatch).toBe('function');
    expect(typeof useAppSelector).toBe('function');
  });
});
