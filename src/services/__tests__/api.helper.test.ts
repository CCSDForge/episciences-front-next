import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiCall, fetchPaginatedResults, fetchResourceById, transformData } from '../api.helper';

describe('api.helper', () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;
  const apiRoot = 'https://api.example.com';

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.stubEnv('NEXT_PUBLIC_API_ROOT_ENDPOINT', apiRoot);
  });

  afterEach(() => {
    global.fetch = originalFetch;
    vi.unstubAllEnvs();
    vi.resetAllMocks();
  });

  describe('apiCall', () => {
    it('should make a successful GET request', async () => {
      const mockResponse = { id: 1, name: 'Test' };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await apiCall('test-endpoint');

      expect(mockFetch).toHaveBeenCalledWith(
        `${apiRoot}/test-endpoint`,
        expect.objectContaining({
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
        })
      );
      expect(result).toEqual(mockResponse);
    });

    it('should throw an error when API root is missing', async () => {
      vi.stubEnv('NEXT_PUBLIC_API_ROOT_ENDPOINT', '');
      await expect(apiCall('test')).rejects.toThrow('API root endpoint not defined');
    });

    it('should handle API errors', async () => {
      mockFetch.mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      await expect(apiCall('test')).rejects.toThrow('API error: 404 Not Found');
    });

    it('should pass options correctly', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({}),
      });

      await apiCall('test', {
        method: 'POST',
        body: { foo: 'bar' },
        headers: { 'X-Custom': 'value' },
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ foo: 'bar' }),
          headers: expect.objectContaining({
            'X-Custom': 'value',
          }),
        })
      );
    });
  });

  describe('fetchPaginatedResults', () => {
    it('should construct query params correctly', async () => {
      const mockResponse = {
        'hydra:member': [{ id: 1 }],
        'hydra:totalItems': 10,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const result = await fetchPaginatedResults('items', {
        page: 2,
        itemsPerPage: 20,
        filter: 'active',
      });

      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('page=2'), expect.any(Object));
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('itemsPerPage=20'),
        expect.any(Object)
      );
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('filter=active'),
        expect.any(Object)
      );

      expect(result).toEqual({
        data: [{ id: 1 }],
        totalItems: 10,
      });
    });

    it('should apply transformer if provided', async () => {
      const mockResponse = {
        'hydra:member': [{ id: 1, name: 'raw' }],
        'hydra:totalItems': 1,
      };
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => mockResponse,
      });

      const transformer = (item: any) => ({ ...item, transformed: true });

      const result = await fetchPaginatedResults('items', {}, transformer);

      expect(result.data[0]).toEqual({ id: 1, name: 'raw', transformed: true });
    });
  });

  describe('fetchResourceById', () => {
    it('should fetch specific resource', async () => {
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ id: 123 }),
      });

      await fetchResourceById('users', 123);

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/users/123'),
        expect.any(Object)
      );
    });
  });

  describe('transformData', () => {
    it('should transform single item', () => {
      const input = { val: 1 };
      const output = transformData(input, i => ({ val: i.val + 1 }));
      expect(output).toEqual({ val: 2 });
    });
  });
});
