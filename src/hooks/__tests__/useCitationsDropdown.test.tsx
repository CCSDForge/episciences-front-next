import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useCitationsDropdown } from '../useCitationsDropdown';
import { getCitations, copyToClipboardCitation } from '@/utils/article';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';

// --- Mocks ---

vi.mock('@/store/features/article/article.query', () => ({
  useFetchArticleMetadataQuery: vi.fn(),
}));

vi.mock('@/utils/article', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/article')>();
  return {
    ...actual,
    getCitations: vi.fn(),
    copyToClipboardCitation: vi.fn(),
  };
});

// --- Tests ---

describe('useCitationsDropdown', () => {
  const mockT = vi.fn((key: string) => key);

  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no data yet
    vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: undefined } as any);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Initial state
  // ─────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('returns empty citations array', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      expect(result.current.citations).toEqual([]);
    });

    it('returns showCitationsDropdown = false', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      expect(result.current.showCitationsDropdown).toBe(false);
    });

    it('returns a citationsDropdownRef', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      expect(result.current.citationsDropdownRef).toBeDefined();
    });

    it('skips both queries initially (shouldLoadCitations = false)', () => {
      renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true })
      );
    });

    it('skips query when rvcode is undefined', () => {
      renderHook(() => useCitationsDropdown(42, undefined, mockT as any));
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: true })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // handleTriggerMouseEnter
  // ─────────────────────────────────────────────────────────────────────────
  describe('handleTriggerMouseEnter', () => {
    it('opens the dropdown', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerMouseEnter());
      expect(result.current.showCitationsDropdown).toBe(true);
    });

    it('activates citation loading (skip becomes false)', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerMouseEnter());
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: false })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // handleTriggerClick
  // ─────────────────────────────────────────────────────────────────────────
  describe('handleTriggerClick', () => {
    it('opens the dropdown on first click', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerClick());
      expect(result.current.showCitationsDropdown).toBe(true);
    });

    it('toggles dropdown closed on second click', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerClick());
      act(() => result.current.handleTriggerClick());
      expect(result.current.showCitationsDropdown).toBe(false);
    });

    it('activates citation loading (skip becomes false)', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerClick());
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ skip: false })
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // handleContainerMouseLeave
  // ─────────────────────────────────────────────────────────────────────────
  describe('handleContainerMouseLeave', () => {
    it('closes the dropdown', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      act(() => result.current.handleTriggerMouseEnter());
      expect(result.current.showCitationsDropdown).toBe(true);
      act(() => result.current.handleContainerMouseLeave());
      expect(result.current.showCitationsDropdown).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Citation data loading
  // ─────────────────────────────────────────────────────────────────────────
  describe('citation data loading', () => {
    it('populates citations when both CSL and BibTeX data are available', async () => {
      vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: 'mock-data' } as any);
      vi.mocked(getCitations).mockResolvedValue([
        { key: 'APA', citation: 'Author et al. 2024' },
        { key: 'BibTeX', citation: '@article{...}' },
      ]);

      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      await act(async () => {});

      expect(result.current.citations).toHaveLength(2);
      expect(result.current.citations[0].key).toBe('APA');
    });

    it('fills BibTeX citation when metadataBibTeX is present', async () => {
      vi.mocked(useFetchArticleMetadataQuery).mockReturnValue({ data: 'bibtex-raw' } as any);
      vi.mocked(getCitations).mockResolvedValue([
        { key: 'APA', citation: 'APA text' },
        { key: 'BibTeX', citation: '' }, // initially empty
      ]);

      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      await act(async () => {});

      const bibtex = result.current.citations.find(c => c.key === 'BibTeX');
      expect(bibtex?.citation).toBe('bibtex-raw');
    });

    it('does not populate citations when only CSL is available', async () => {
      // First call (CSL) returns data, second call (BibTeX) returns undefined
      vi.mocked(useFetchArticleMetadataQuery)
        .mockReturnValueOnce({ data: 'csl-data' } as any)
        .mockReturnValueOnce({ data: undefined } as any);

      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      await act(async () => {});

      expect(result.current.citations).toEqual([]);
    });

    it('passes articleId and rvcode to the query', () => {
      renderHook(() => useCitationsDropdown(99, 'myjournal', mockT as any));
      expect(useFetchArticleMetadataQuery).toHaveBeenCalledWith(
        expect.objectContaining({ rvcode: 'myjournal', paperid: '99' }),
        expect.anything()
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // copyCitation
  // ─────────────────────────────────────────────────────────────────────────
  describe('copyCitation', () => {
    it('calls copyToClipboardCitation with the citation and t', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      const citation = { key: 'APA', citation: 'Author 2024' };

      act(() => result.current.copyCitation(citation));

      expect(copyToClipboardCitation).toHaveBeenCalledWith(citation, mockT);
    });

    it('closes the dropdown after copying', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      act(() => result.current.handleTriggerMouseEnter());
      expect(result.current.showCitationsDropdown).toBe(true);

      act(() => result.current.copyCitation({ key: 'APA', citation: 'Author 2024' }));
      expect(result.current.showCitationsDropdown).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Touch outside
  // ─────────────────────────────────────────────────────────────────────────
  describe('touch outside', () => {
    it('closes dropdown when touchstart fires outside the ref element', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      // Attach ref to a DOM node so the containment check works
      const container = document.createElement('div');
      document.body.appendChild(container);
      act(() => {
        result.current.citationsDropdownRef.current = container;
        result.current.handleTriggerMouseEnter();
      });
      expect(result.current.showCitationsDropdown).toBe(true);

      // Touch outside the container (on body directly)
      act(() => {
        fireEvent.touchStart(document.body);
      });
      expect(result.current.showCitationsDropdown).toBe(false);

      document.body.removeChild(container);
    });

    it('does not close dropdown when touchstart fires inside the ref element', () => {
      const { result } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));

      const container = document.createElement('div');
      const inner = document.createElement('button');
      container.appendChild(inner);
      document.body.appendChild(container);

      act(() => {
        result.current.citationsDropdownRef.current = container;
        result.current.handleTriggerMouseEnter();
      });

      act(() => {
        fireEvent.touchStart(inner);
      });
      expect(result.current.showCitationsDropdown).toBe(true);

      document.body.removeChild(container);
    });

    it('removes the touchstart listener on unmount', () => {
      const spy = vi.spyOn(document, 'removeEventListener');
      const { unmount } = renderHook(() => useCitationsDropdown(42, 'rv', mockT as any));
      unmount();
      expect(spy).toHaveBeenCalledWith('touchstart', expect.any(Function));
    });
  });
});
