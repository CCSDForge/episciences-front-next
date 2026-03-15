import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { useFetchVolumesQuery } from '@/store/features/volume/volume.query';
import { setLastVolume } from '@/store/features/volume/volume.slice';
import LastVolumeHook from '../lastVolume';

// --- Mocks ---

vi.mock('@/hooks/store', () => ({
  useAppDispatch: vi.fn(),
  useAppSelector: vi.fn(),
}));

vi.mock('@/store/features/volume/volume.query', () => ({
  useFetchVolumesQuery: vi.fn(),
}));

vi.mock('@/store/features/volume/volume.slice', () => ({
  setLastVolume: vi.fn((payload: unknown) => ({
    type: 'volume/setLastVolume',
    payload,
  })),
}));

// --- Fixtures ---

const mockJournal = { code: 'testjournal', name: 'Test Journal' };
const mockVolume = { id: 42, title: 'Volume 1' };
const mockDispatch = vi.fn();

// Helper: build a Redux state selector mock for this hook.
// LastVolumeHook calls useAppSelector 3 times:
//   1. state.i18nReducer.language
//   2. state.journalReducer.currentJournal
//   3. state.volumeReducer.lastVolume
function mockSelector({
  language = 'en',
  currentJournal = mockJournal,
  lastVolume = null,
}: {
  language?: string;
  currentJournal?: typeof mockJournal | null;
  lastVolume?: typeof mockVolume | null;
} = {}) {
  vi.mocked(useAppSelector).mockImplementation((selector: any) =>
    selector({
      i18nReducer: { language },
      journalReducer: { currentJournal },
      volumeReducer: { lastVolume },
    })
  );
}

// --- Tests ---

describe('LastVolumeHook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAppDispatch).mockReturnValue(mockDispatch);
    vi.mocked(useFetchVolumesQuery).mockReturnValue({ data: undefined } as any);
    mockSelector();
  });

  describe('rendering', () => {
    it('returns null', () => {
      const { result } = renderHook(() => LastVolumeHook());
      expect(result.current).toBeNull();
    });
  });

  describe('RTK Query call', () => {
    it('calls useFetchVolumesQuery with rvcode, language, page=1, itemsPerPage=1', () => {
      renderHook(() => LastVolumeHook());
      expect(useFetchVolumesQuery).toHaveBeenCalledWith(
        { rvcode: 'testjournal', language: 'en', page: 1, itemsPerPage: 1 },
        { skip: false }
      );
    });

    it('skips query when currentJournal is null', () => {
      mockSelector({ currentJournal: null });
      renderHook(() => LastVolumeHook());
      expect(useFetchVolumesQuery).toHaveBeenCalledWith(
        expect.anything(),
        { skip: true }
      );
    });

    it('passes the current language to the volumes query', () => {
      mockSelector({ language: 'fr' });
      renderHook(() => LastVolumeHook());
      expect(useFetchVolumesQuery).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'fr' }),
        expect.anything()
      );
    });
  });

  describe('dispatch logic', () => {
    it('dispatches setLastVolume with the first volume when all conditions are met', async () => {
      vi.mocked(useFetchVolumesQuery).mockReturnValue({
        data: { data: [mockVolume] },
      } as any);

      renderHook(() => LastVolumeHook());

      await waitFor(() => {
        expect(mockDispatch).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'volume/setLastVolume',
            payload: mockVolume,
          })
        );
      });
    });

    it('does not dispatch when volumes data is undefined', async () => {
      vi.mocked(useFetchVolumesQuery).mockReturnValue({ data: undefined } as any);

      renderHook(() => LastVolumeHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when volumes.data is empty', async () => {
      vi.mocked(useFetchVolumesQuery).mockReturnValue({
        data: { data: [] },
      } as any);

      renderHook(() => LastVolumeHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when currentJournal is null', async () => {
      mockSelector({ currentJournal: null });
      vi.mocked(useFetchVolumesQuery).mockReturnValue({
        data: { data: [mockVolume] },
      } as any);

      renderHook(() => LastVolumeHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('does not dispatch when lastVolume is already in the store', async () => {
      mockSelector({ lastVolume: mockVolume });
      vi.mocked(useFetchVolumesQuery).mockReturnValue({
        data: { data: [mockVolume] },
      } as any);

      renderHook(() => LastVolumeHook());

      await new Promise(resolve => setTimeout(resolve, 10));
      expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches only the first item from volumes.data', async () => {
      const secondVolume = { id: 43, title: 'Volume 2' };
      vi.mocked(useFetchVolumesQuery).mockReturnValue({
        data: { data: [mockVolume, secondVolume] },
      } as any);

      renderHook(() => LastVolumeHook());

      await waitFor(() => {
        expect(vi.mocked(setLastVolume)).toHaveBeenCalledWith(mockVolume);
        expect(vi.mocked(setLastVolume)).not.toHaveBeenCalledWith(secondVolume);
      });
    });
  });
});
