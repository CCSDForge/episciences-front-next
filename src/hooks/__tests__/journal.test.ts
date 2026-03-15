import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useFetchJournalQuery } from '@/store/features/journal/journal.query';
import { setCurrentJournal } from '@/store/features/journal/journal.slice';
import JournalHook from '../journal';

// --- Mocks ---

vi.mock('@/hooks/store', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

vi.mock('@/store/features/journal/journal.query', () => ({
  useFetchJournalQuery: vi.fn(),
}));

vi.mock('@/store/features/journal/journal.slice', () => ({
  setCurrentJournal: vi.fn((payload: unknown) => ({
    type: 'journal/setCurrentJournal',
    payload,
  })),
}));

// --- Fixtures ---

const mockJournal = { code: 'testjournal', name: 'Test Journal' };
const mockDispatch = vi.fn();

// --- Tests ---

describe('JournalHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'testjournal';
    vi.mocked(useAppDispatch).mockReturnValue(mockDispatch);
    vi.mocked(useFetchJournalQuery).mockReturnValue({ data: undefined } as any);
    // Default selector: no currentJournal in store
    vi.mocked(useAppSelector).mockImplementation((selector: any) =>
      selector({ journalReducer: { currentJournal: null } })
    );
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  });

  describe('rendering', () => {
    it('returns null', () => {
      const { result } = renderHook(() => JournalHook());
      expect(result.current).toBeNull();
    });
  });

  describe('RTK Query call', () => {
    it('calls useFetchJournalQuery with the env journal rvcode', () => {
      renderHook(() => JournalHook());
      expect(useFetchJournalQuery).toHaveBeenCalledWith('testjournal');
    });

    it('calls useFetchJournalQuery with empty string when NEXT_PUBLIC_JOURNAL_RVCODE is not set', () => {
      delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
      renderHook(() => JournalHook());
      expect(useFetchJournalQuery).toHaveBeenCalledWith('');
    });
  });

  describe('dispatch logic', () => {
    it('dispatches setCurrentJournal when journal is fetched and store is empty', async () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({ data: mockJournal } as any);

      renderHook(() => JournalHook());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'journal/setCurrentJournal',
            payload: mockJournal,
          })
        );
      });
    });

    it('does not dispatch when fetchedJournal is undefined', async () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({ data: undefined } as any);

      renderHook(() => JournalHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when currentJournal is already in the store', async () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({ data: mockJournal } as any);
      vi.mocked(useAppSelector).mockImplementation((selector: any) =>
        selector({ journalReducer: { currentJournal: mockJournal } })
      );

      renderHook(() => JournalHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches only once even if called multiple times (guards against re-dispatch)', async () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({ data: mockJournal } as any);

      const { rerender } = renderHook(() => JournalHook());
      rerender();
      rerender();

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('setCurrentJournal action', () => {
    it('passes the fetched journal as payload to setCurrentJournal', async () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({ data: mockJournal } as any);

      renderHook(() => JournalHook());

      await waitFor(() => {
        expect(vi.mocked(setCurrentJournal)).toHaveBeenCalledWith(mockJournal);
      });
    });
  });
});
