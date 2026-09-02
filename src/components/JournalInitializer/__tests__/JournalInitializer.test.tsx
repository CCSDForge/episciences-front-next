import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { JournalInitializer } from '../JournalInitializer';
import { useFetchJournalQuery } from '@/store/features/journal/journal.query';
import { setCurrentJournal } from '@/store/features/journal/journal.slice';

const mockDispatch = vi.fn();
let mockState: { journalReducer: { currentJournal: unknown } };

vi.mock('@/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

vi.mock('@/store/features/journal/journal.query', () => ({
  useFetchJournalQuery: vi.fn(),
}));

describe('JournalInitializer', () => {
  const refetch = vi.fn();

  beforeEach(() => {
    mockDispatch.mockClear();
    refetch.mockClear();
    mockState = { journalReducer: { currentJournal: undefined } };
    vi.mocked(useFetchJournalQuery).mockReturnValue({
      data: undefined,
      error: undefined,
      isLoading: false,
      refetch,
    } as never);
  });

  it('renders nothing', () => {
    const { container } = render(<JournalInitializer journalId="epijinfo" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dispatches setCurrentJournal when the fetched journal differs from the store', () => {
    const journal = { code: 'epijinfo', name: 'Epi Journal' } as never;
    vi.mocked(useFetchJournalQuery).mockReturnValue({
      data: journal,
      error: undefined,
      isLoading: false,
      refetch,
    } as never);

    render(<JournalInitializer journalId="epijinfo" />);
    expect(mockDispatch).toHaveBeenCalledWith(setCurrentJournal(journal));
  });

  it('does not dispatch again when the journal code already matches the store', () => {
    const journal = { code: 'epijinfo', name: 'Epi Journal' } as never;
    mockState = { journalReducer: { currentJournal: journal } };
    vi.mocked(useFetchJournalQuery).mockReturnValue({
      data: journal,
      error: undefined,
      isLoading: false,
      refetch,
    } as never);

    render(<JournalInitializer journalId="epijinfo" />);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch while the query is still loading', () => {
    vi.mocked(useFetchJournalQuery).mockReturnValue({
      data: { code: 'epijinfo' },
      error: undefined,
      isLoading: true,
      refetch,
    } as never);

    render(<JournalInitializer journalId="epijinfo" />);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  describe('on fetch error', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('dispatches a default journal fallback when none is set yet', () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({
        data: undefined,
        error: new Error('network down'),
        isLoading: false,
        refetch,
      } as never);

      render(<JournalInitializer journalId="epijinfo" />);

      expect(mockDispatch).toHaveBeenCalledWith(
        setCurrentJournal(expect.objectContaining({ code: 'epijinfo' }))
      );
    });

    it('does not dispatch a fallback when a journal is already in the store', () => {
      mockState = { journalReducer: { currentJournal: { code: 'epijinfo' } } };
      vi.mocked(useFetchJournalQuery).mockReturnValue({
        data: undefined,
        error: new Error('network down'),
        isLoading: false,
        refetch,
      } as never);

      render(<JournalInitializer journalId="epijinfo" />);
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('retries the query after a 2s delay', () => {
      vi.mocked(useFetchJournalQuery).mockReturnValue({
        data: undefined,
        error: new Error('network down'),
        isLoading: false,
        refetch,
      } as never);

      render(<JournalInitializer journalId="epijinfo" />);
      expect(refetch).not.toHaveBeenCalled();

      vi.advanceTimersByTime(2000);
      expect(refetch).toHaveBeenCalled();
    });
  });
});
