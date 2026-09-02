import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchVolumes } from '../api';

const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('api utils - fetchVolumes', () => {
  const originalEndpoint = process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT = 'https://api.test';
  });

  it('fetches and transforms volumes with requested language', async () => {
    const rawVolume = {
      vid: 101,
      titles: { fr: 'Titre FR', en: 'Title EN' },
      vol_type: 'regular',
      vol_year: '2025',
      vol_num: '1',
      descriptions: { fr: 'Description FR', en: 'Description EN' },
      date_creation: '2025-01-01',
      date_updated: '2025-01-02',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'hydra:member': [rawVolume],
          'hydra:totalItems': 1,
        }),
    });

    const result = await fetchVolumes('epijinfo', 'fr');

    expect(mockFetch).toHaveBeenCalledWith(
      'https://api.test/volumes?page=1&itemsPerPage=1&rvcode=epijinfo'
    );
    expect(result.totalItems).toBe(1);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual({
      id: 101,
      title: 'Titre FR',
      type: 'regular',
      year: '2025',
      number: '1',
      description: 'Description FR',
      published: true,
      createdAt: '2025-01-01',
      updatedAt: '2025-01-02',
    });
  });

  it('falls back to English when requested language is not present', async () => {
    const rawVolume = {
      vid: 102,
      titles: { en: 'Title Only EN' },
      vol_type: 'special',
      vol_year: '2024',
      vol_num: '2',
      descriptions: { en: 'Desc Only EN' },
      date_creation: '2024-05-01',
      date_updated: '2024-05-02',
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'hydra:member': [rawVolume],
          'hydra:totalItems': 1,
        }),
    });

    const result = await fetchVolumes('epijinfo', 'es');

    expect(result.data[0].title).toBe('Title Only EN');
    expect(result.data[0].description).toBe('Desc Only EN');
  });

  it('handles empty volumes list', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          'hydra:member': [],
          'hydra:totalItems': 0,
        }),
    });

    const result = await fetchVolumes('epijinfo', 'en');
    expect(result.totalItems).toBe(0);
    expect(result.data).toEqual([]);
  });
});
