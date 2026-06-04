import { renderHook, act } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { useFilterSections } from '../useFilterSections';

type TestKey = 'types' | 'years' | 'volumes';

const initialSections = [
  { key: 'types' as TestKey, isOpened: false },
  { key: 'years' as TestKey, isOpened: true },
  { key: 'volumes' as TestKey, isOpened: false },
];

describe('useFilterSections', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Initial state
  // ─────────────────────────────────────────────────────────────────────────
  describe('initial state', () => {
    it('returns isOpened=false for initially closed sections', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));
      expect(result.current.isOpened('types')).toBe(false);
      expect(result.current.isOpened('volumes')).toBe(false);
    });

    it('returns isOpened=true for initially opened sections', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));
      expect(result.current.isOpened('years')).toBe(true);
    });

    it('returns false for unknown key', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));
      expect(result.current.isOpened('unknown' as TestKey)).toBe(false);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // toggle
  // ─────────────────────────────────────────────────────────────────────────
  describe('toggle', () => {
    it('opens a closed section', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));

      act(() => {
        result.current.toggle('types');
      });

      expect(result.current.isOpened('types')).toBe(true);
    });

    it('closes an open section', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));

      act(() => {
        result.current.toggle('years');
      });

      expect(result.current.isOpened('years')).toBe(false);
    });

    it('does not affect other sections when toggling one', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));

      act(() => {
        result.current.toggle('types');
      });

      // years was initially open and should still be open
      expect(result.current.isOpened('years')).toBe(true);
      // volumes was initially closed and should still be closed
      expect(result.current.isOpened('volumes')).toBe(false);
    });

    it('toggles back to original state on double toggle', () => {
      const { result } = renderHook(() => useFilterSections(initialSections));

      act(() => {
        result.current.toggle('types');
      });
      act(() => {
        result.current.toggle('types');
      });

      expect(result.current.isOpened('types')).toBe(false);
    });

    it('handles empty sections without error', () => {
      const { result } = renderHook(() => useFilterSections<TestKey>([]));

      act(() => {
        result.current.toggle('types');
      });

      expect(result.current.isOpened('types')).toBe(false);
    });
  });
});
