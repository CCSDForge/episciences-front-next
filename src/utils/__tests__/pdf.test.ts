import { describe, it, expect } from 'vitest';
import { isAllowedPdfDomain, generateArticleFilename, getPdfProxyUrl } from '../pdf';

describe('isAllowedPdfDomain', () => {
  it('allows an exact whitelisted domain over https', () => {
    expect(isAllowedPdfDomain('https://zenodo.org/record/1/file.pdf')).toBe(true);
  });

  it('allows a subdomain of a whitelisted domain', () => {
    expect(isAllowedPdfDomain('https://export.arxiv.org/pdf/1234')).toBe(true);
  });

  it('rejects a non-whitelisted domain', () => {
    expect(isAllowedPdfDomain('https://evil.com/file.pdf')).toBe(false);
  });

  it('rejects a domain that merely contains a whitelisted name as a suffix without a dot', () => {
    expect(isAllowedPdfDomain('https://evilzenodo.org/file.pdf')).toBe(false);
  });

  it('rejects http (non-https) urls', () => {
    expect(isAllowedPdfDomain('http://zenodo.org/file.pdf')).toBe(false);
  });

  it('returns false for a malformed URL', () => {
    expect(isAllowedPdfDomain('not a url')).toBe(false);
  });
});

describe('generateArticleFilename', () => {
  it('builds a sanitized, prefixed filename', () => {
    const filename = generateArticleFilename('epijinfo', 42, 'A Título: with Spaces!');
    expect(filename).toBe('epijinfo_article_42_a_ttulo_with_spaces.pdf');
  });

  it('omits the prefix when journalCode is empty', () => {
    const filename = generateArticleFilename('', 1, 'Title');
    expect(filename).toBe('article_1_title.pdf');
  });

  it('truncates the sanitized title to 50 characters', () => {
    const longTitle = 'a'.repeat(100);
    const filename = generateArticleFilename('epijinfo', 1, longTitle);
    expect(filename).toBe(`epijinfo_article_1_${'a'.repeat(50)}.pdf`);
  });
});

describe('getPdfProxyUrl', () => {
  it('defaults to inline disposition', () => {
    const url = getPdfProxyUrl('https://zenodo.org/file.pdf');
    expect(url).toBe(
      '/api/pdf-proxy?url=https%3A%2F%2Fzenodo.org%2Ffile.pdf&disposition=inline'
    );
  });

  it('appends the filename only for attachment disposition', () => {
    const url = getPdfProxyUrl('https://zenodo.org/file.pdf', 'attachment', 'article.pdf');
    expect(url).toContain('disposition=attachment');
    expect(url).toContain('filename=article.pdf');
  });

  it('ignores the filename when disposition is inline', () => {
    const url = getPdfProxyUrl('https://zenodo.org/file.pdf', 'inline', 'article.pdf');
    expect(url).not.toContain('filename=');
  });
});
