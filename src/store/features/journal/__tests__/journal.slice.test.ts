import { describe, it, expect, afterEach } from 'vitest';
import reducer, {
  setCurrentJournal,
  setApiEndpoint,
  setJournalConfig,
  selectApiEndpoint,
  selectJournalConfig,
  selectConfigValue,
} from '../journal.slice';

describe('journal.slice', () => {
  const initialState = { journals: [] };

  it('returns the initial state', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual(initialState);
  });

  it('setCurrentJournal stores the journal', () => {
    const journal = { rvcode: 'epijinfo', name: 'Epi Journal' } as never;
    const state = reducer(initialState, setCurrentJournal(journal));
    expect(state.currentJournal).toEqual(journal);
  });

  it('setApiEndpoint stores the endpoint', () => {
    const state = reducer(initialState, setApiEndpoint('https://api.test'));
    expect(selectApiEndpoint({ journalReducer: state })).toBe('https://api.test');
  });

  it('setJournalConfig stores the config object', () => {
    const state = reducer(
      initialState,
      setJournalConfig({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#fff' })
    );
    expect(selectJournalConfig({ journalReducer: state })).toEqual({
      NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#fff',
    });
  });

  describe('selectConfigValue', () => {
    afterEach(() => {
      delete process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR;
    });

    it('prefers the dynamic Redux config over process.env', () => {
      process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR = '#000';
      const state = reducer(
        initialState,
        setJournalConfig({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#fff' })
      );

      const value = selectConfigValue('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR')({
        journalReducer: state,
      });

      expect(value).toBe('#fff');
    });

    it('falls back to process.env when no dynamic config is set', () => {
      process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR = '#000';

      const value = selectConfigValue('NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR')({
        journalReducer: initialState,
      });

      expect(value).toBe('#000');
    });
  });
});
