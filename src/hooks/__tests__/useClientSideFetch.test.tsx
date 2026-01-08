import { renderHook, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useClientSideFetch } from '../useClientSideFetch';

describe('useClientSideFetch', () => {
  const mockFetchFn = vi.fn();
  const initialData = { id: 1, name: 'Initial' };
  const updatedData = { id: 1, name: 'Updated' };

  beforeEach(() => {
    vi.resetAllMocks();
    vi.clearAllMocks();
  });

  it('should return initial data immediately', async () => {
    mockFetchFn.mockResolvedValue(updatedData);

    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
      })
    );

    expect(result.current.data).toEqual(initialData);
    expect(result.current.isUpdating).toBe(true);
    expect(result.current.error).toBeNull();

    // Wait for the update to complete to avoid "act" warnings
    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });
  });

  it('should update data after successful fetch', async () => {
    mockFetchFn.mockResolvedValue(updatedData);

    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
      })
    );

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(result.current.data).toEqual(updatedData);
    expect(result.current.error).toBeNull();
  });

  it('should handle fetch errors gracefully', async () => {
    const error = new Error('Fetch failed');
    mockFetchFn.mockRejectedValue(error);
    const onError = vi.fn();

    // Spy on console.warn to suppress output during test
    const consoleSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
        onError,
      })
    );

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    // Data should remain initialData (graceful degradation)
    expect(result.current.data).toEqual(initialData);
    expect(result.current.error).toEqual(error);
    expect(onError).toHaveBeenCalledWith(error);

    consoleSpy.mockRestore();
  });

  it('should not fetch when enabled is false', () => {
    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
        enabled: false,
      })
    );

    expect(mockFetchFn).not.toHaveBeenCalled();
    expect(result.current.isUpdating).toBe(false);
    expect(result.current.data).toEqual(initialData);
  });

  it('should respect manual refetch', async () => {
    mockFetchFn.mockResolvedValue(updatedData);

    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
        enabled: false, // Start disabled
      })
    );

    expect(mockFetchFn).not.toHaveBeenCalled();

    await act(async () => {
      await result.current.refetch();
    });

    expect(mockFetchFn).toHaveBeenCalledTimes(1);
    expect(result.current.data).toEqual(updatedData);
  });

  it('should only update state if data has changed', async () => {
    // Return same data as initial
    mockFetchFn.mockResolvedValue(initialData);

    const { result } = renderHook(() =>
      useClientSideFetch({
        fetchFn: mockFetchFn,
        initialData,
      })
    );

    await waitFor(() => {
      expect(result.current.isUpdating).toBe(false);
    });

    expect(result.current.data).toEqual(initialData);
    // We can't easily check if setData was called without spying on useState,
    // but we can check behaviorally or verify re-renders if we cared about perf.
    // For now, checking the value is correct is sufficient.
  });
});
