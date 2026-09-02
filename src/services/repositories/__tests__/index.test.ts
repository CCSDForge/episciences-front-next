import { describe, it, expect, vi, afterEach } from 'vitest';
import { findRepositoryProvider, resolveRepositoryPreviews, repositoryProviders } from '../index';
import { IArticleRelatedItem } from '@/types/article';

describe('findRepositoryProvider', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the nakala provider for a nakala DOI', () => {
    const match = findRepositoryProvider('10.34847/nkl.067bpg32');
    expect(match?.provider.id).toBe('nakala');
    expect(match?.identifier).toBe('10.34847/nkl.067bpg32');
  });

  it('returns null for a value no provider recognizes', () => {
    expect(findRepositoryProvider('not-a-repository-identifier')).toBeNull();
  });

  it('matches at most one provider for a sample of real-shaped identifiers', () => {
    const samples = [
      '10.34847/nkl.067bpg32',
      'hal-04661084',
      '10.5281/zenodo.1234',
      'swh:1:dir:abcdef0123456789abcdef0123456789abcdef01',
      'https://doi.org/10.1234/unrelated',
    ];

    for (const sample of samples) {
      const matches = repositoryProviders.filter(provider => provider.match(sample) !== null);
      expect(matches.length).toBeLessThanOrEqual(1);
    }
  });
});

describe('resolveRepositoryPreviews', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns an empty object for no related items', async () => {
    expect(await resolveRepositoryPreviews([])).toEqual({});
  });

  it('keys previews by identifierType-value and skips items with no previewable files', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: 'published',
        fileEmbargoed: false,
        files: [
          {
            name: 'Annexe.jpg',
            extension: 'jpg',
            mime_type: 'image/jpeg',
            sha1: '0e71fc6c0c599471b34070c66c18a96a77c7f6c8',
          },
        ],
      }),
    });

    const relatedItems: IArticleRelatedItem[] = [
      { value: '10.34847/nkl.067bpg32', identifierType: 'doi', relationshipType: 'cites' },
      { value: 'not-a-repository', identifierType: 'other', relationshipType: 'cites' },
    ];

    const previews = await resolveRepositoryPreviews(relatedItems);

    expect(Object.keys(previews)).toEqual(['doi-10.34847/nkl.067bpg32']);
    expect(previews['doi-10.34847/nkl.067bpg32'].files).toHaveLength(1);
  });

  it('omits an item whose provider resolves to no previewable files', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'published', fileEmbargoed: false, files: [] }),
    });

    const relatedItems: IArticleRelatedItem[] = [
      { value: '10.34847/nkl.067bpg32', identifierType: 'doi', relationshipType: 'cites' },
    ];

    expect(await resolveRepositoryPreviews(relatedItems)).toEqual({});
  });
});
