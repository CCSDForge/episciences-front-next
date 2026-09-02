import { describe, it, expect } from 'vitest';
import { getLicenseLabelInfo, getCitations, CITATION_TEMPLATE } from '../article';

describe('getLicenseLabelInfo', () => {
  describe('Creative Commons licenses', () => {
    it('should handle CC BY license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic4.0',
      });
    });

    it('should handle CC BY-NC license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'nonCommercial4.0',
      });
    });

    it('should handle CC BY-ND license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nd/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'noDerivatives4.0',
      });
    });

    it('should handle CC BY-SA license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-sa/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'shareAlike4.0',
      });
    });

    it('should handle CC BY-NC-ND license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc-nd/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'noDerivativesNonCommercial4.0',
      });
    });

    it('should handle CC BY-NC-SA license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc-sa/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'nonCommercialShareAlike4.0',
      });
    });

    it('should handle different versions', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/3.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic3.0',
      });
    });

    it('should handle URLs without trailing slash', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/4.0');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic4.0',
      });
    });
  });

  describe('Creative Commons Zero (CC0)', () => {
    it('should handle CC0 license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/publicdomain/zero/1.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'zero1.0',
      });
    });
  });

  describe('arXiv licenses', () => {
    it('should handle arXiv assumed license', () => {
      const result = getLicenseLabelInfo('http://arxiv.org/licenses/assumed-1991-2003');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.arxiv',
        key: 'assumed',
      });
    });

    it('should handle arXiv non-exclusive license', () => {
      const result = getLicenseLabelInfo('http://arxiv.org/licenses/nonexclusive-distrib/1.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.arxiv',
        key: 'nonExclusive',
      });
    });
  });

  describe('Edge cases', () => {
    it('should return null for empty string', () => {
      const result = getLicenseLabelInfo('');
      expect(result).toBeNull();
    });

    it('should return null for unknown license URL', () => {
      const result = getLicenseLabelInfo('https://example.com/license');
      expect(result).toBeNull();
    });

    it('should return null for null/undefined (if types allowed)', () => {
      // @ts-ignore
      expect(getLicenseLabelInfo(null)).toBeNull();
      // @ts-ignore
      expect(getLicenseLabelInfo(undefined)).toBeNull();
    });
  });
});

describe('getCitations', () => {
  const sampleCSL = JSON.stringify({
    id: 'test-article-1',
    type: 'article-journal',
    title: 'Quantum Computing and Cryptography',
    author: [
      { family: 'Turing', given: 'Alan' },
      { family: 'Lovelace', given: 'Ada' },
    ],
    issued: {
      'date-parts': [[2024, 3, 15]],
    },
    'container-title': 'Journal of Open Science',
    volume: '42',
    issue: '2',
    page: '100-115',
    DOI: '10.1000/182',
  });

  it('should return an empty array when csl is undefined or empty', async () => {
    expect(await getCitations()).toEqual([]);
    expect(await getCitations('')).toEqual([]);
    expect(await getCitations('   ')).toEqual([]);
  });

  it('should return all citation formats with valid content for valid CSL input', async () => {
    const citations = await getCitations(sampleCSL);

    expect(citations).toHaveLength(6);

    const ams = citations.find(c => c.key === CITATION_TEMPLATE.AMS);
    const apa = citations.find(c => c.key === CITATION_TEMPLATE.APA);
    const bibtex = citations.find(c => c.key === CITATION_TEMPLATE.BIBTEX);
    const ieee = citations.find(c => c.key === CITATION_TEMPLATE.IEEE);
    const mla = citations.find(c => c.key === CITATION_TEMPLATE.MLA);
    const vancouver = citations.find(c => c.key === CITATION_TEMPLATE.VANCOUVER);

    expect(ams).toBeDefined();
    expect(apa).toBeDefined();
    expect(bibtex).toBeDefined();
    expect(ieee).toBeDefined();
    expect(mla).toBeDefined();
    expect(vancouver).toBeDefined();

    // BibTeX is empty initially in getCitations (fetched separately from metadataBibTeX)
    expect(bibtex?.citation).toBe('');

    // APA
    expect(apa?.citation).toContain('Turing');
    expect(apa?.citation).toContain('Quantum Computing and Cryptography');
    expect(apa?.citation).toContain('2024');

    // AMS (custom style: asserts that the template is registered)
    expect(ams?.citation).not.toBe('');
    expect(ams?.citation).toContain('Turing');
    expect(ams?.citation).toContain('Quantum Computing and Cryptography');

    // IEEE (custom style: asserts that the template is registered)
    expect(ieee?.citation).not.toBe('');
    expect(ieee?.citation).toContain('A. Turing');
    expect(ieee?.citation).toContain('Quantum Computing and Cryptography');

    // MLA (custom style: asserts that the template is registered and distinct from APA)
    expect(mla?.citation).not.toBe('');
    expect(mla?.citation).toContain('Turing, Alan');
    expect(mla?.citation).toContain('“Quantum Computing and Cryptography.”');
    expect(mla?.citation).not.toEqual(apa?.citation);

    // Vancouver
    expect(vancouver?.citation).toContain('Turing');
    expect(vancouver?.citation).toContain('Quantum Computing and Cryptography');
  });

  it('should handle malformed CSL input gracefully without throwing', async () => {
    const result = await getCitations('{ malformed json');
    expect(result).toEqual([]);
  });
});
