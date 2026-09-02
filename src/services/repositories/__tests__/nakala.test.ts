import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { nakalaProvider } from '../nakala';

function jsonResponse(body: unknown, ok = true, status = 200): Response {
  return {
    ok,
    status,
    json: async () => body,
  } as Response;
}

const PUBLISHED_IDENTIFIER = '10.34847/nkl.067bpg32';
const SHA1 = '0e71fc6c0c599471b34070c66c18a96a77c7f6c8';

describe('nakalaProvider.match', () => {
  it('rejects a bare identifier without the DOI prefix (would false-positive on unrelated ids)', () => {
    expect(nakalaProvider.match('nkl.067bpg32')).toBeNull();
  });

  it('matches a DOI already prefixed, normalizing case', () => {
    expect(nakalaProvider.match('10.34847/NKL.067BPG32')).toBe('10.34847/nkl.067bpg32');
  });

  it('matches a nakala.fr URL', () => {
    expect(nakalaProvider.match('https://nakala.fr/10.34847/nkl.067bpg32')).toBe(
      '10.34847/nkl.067bpg32'
    );
  });

  it('matches a doi.org URL', () => {
    expect(nakalaProvider.match('https://doi.org/10.34847/nkl.067bpg32')).toBe(
      '10.34847/nkl.067bpg32'
    );
  });

  it('rejects a lookalike host (evil-nakala.fr)', () => {
    expect(nakalaProvider.match('https://evil-nakala.fr/10.34847/nkl.067bpg32')).toBeNull();
  });

  it('rejects a lookalike host (nakala.fr.attacker.com)', () => {
    expect(nakalaProvider.match('https://nakala.fr.attacker.com/10.34847/nkl.067bpg32')).toBeNull();
  });

  it('rejects an unrelated DOI', () => {
    expect(nakalaProvider.match('10.5281/zenodo.1234')).toBeNull();
  });

  it('rejects an identifier that is too long', () => {
    expect(nakalaProvider.match(`nkl.${'a'.repeat(200)}`)).toBeNull();
  });

  it('rejects an empty value', () => {
    expect(nakalaProvider.match('')).toBeNull();
  });

  it('rejects a malformed URL', () => {
    expect(nakalaProvider.match('https://')).toBeNull();
  });
});

describe('nakalaProvider.landingUrl', () => {
  it('builds a nakala.fr URL from the normalized identifier', () => {
    expect(nakalaProvider.landingUrl(PUBLISHED_IDENTIFIER)).toBe(
      `https://nakala.fr/${PUBLISHED_IDENTIFIER}`
    );
  });
});

describe('nakalaProvider.resolve', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns the previewable image file for a published, non-embargoed deposit', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [{ name: 'Annexe 7.jpg', extension: 'jpg', mime_type: 'image/jpeg', sha1: SHA1 }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);

    expect(preview.providerId).toBe('nakala');
    expect(preview.files).toHaveLength(1);
    expect(preview.files[0]).toMatchObject({ id: SHA1, label: 'Annexe 7.jpg', kind: 'image' });
    expect(preview.files[0].embedUrl).toBe(
      `https://api.nakala.fr/embed/10.34847/nkl.067bpg32/${SHA1}?buttons=true`
    );
  });

  it('returns no files when the deposit is not published', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'pending',
        files: [{ extension: 'jpg', mime_type: 'image/jpeg', sha1: SHA1 }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('returns no files when the whole deposit is embargoed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: true,
        files: [{ extension: 'jpg', mime_type: 'image/jpeg', sha1: SHA1 }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('skips a file with a future embargo date', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [
          {
            extension: 'jpg',
            mime_type: 'image/jpeg',
            sha1: SHA1,
            embargoed: '2999-01-01T00:00:00+02:00',
          },
        ],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('keeps a file whose embargo date has passed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [
          {
            extension: 'jpg',
            mime_type: 'image/jpeg',
            sha1: SHA1,
            embargoed: '2020-01-01T00:00:00+02:00',
          },
        ],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toHaveLength(1);
  });

  it('skips a file with an invalid sha1', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [{ extension: 'jpg', mime_type: 'image/jpeg', sha1: 'not-a-sha1' }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('does not treat an svg file as previewable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [{ extension: 'svg', mime_type: 'image/svg+xml', sha1: SHA1 }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('does not treat a gif file as previewable', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({
        status: 'published',
        fileEmbargoed: false,
        files: [{ extension: 'gif', mime_type: 'image/gif', sha1: SHA1 }],
      })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('returns no files when the API responds with an error status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(jsonResponse({}, false, 404));

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('returns no files when the fetch throws (e.g. timeout)', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('timeout'));

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });

  it('returns no files when the files array is missing', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue(
      jsonResponse({ status: 'published', fileEmbargoed: false })
    );

    const preview = await nakalaProvider.resolve(PUBLISHED_IDENTIFIER);
    expect(preview.files).toEqual([]);
  });
});
