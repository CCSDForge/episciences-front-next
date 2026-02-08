import { describe, it, expect } from 'vitest';
import { getLicenseLabelInfo } from '../article';

describe('getLicenseLabelInfo', () => {
  describe('Creative Commons licenses', () => {
    it('should handle CC BY license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic4.0'
      });
    });

    it('should handle CC BY-NC license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'nonCommercial4.0'
      });
    });

    it('should handle CC BY-ND license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nd/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'noDerivatives4.0'
      });
    });

    it('should handle CC BY-SA license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-sa/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'shareAlike4.0'
      });
    });

    it('should handle CC BY-NC-ND license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc-nd/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'noDerivativesNonCommercial4.0'
      });
    });

    it('should handle CC BY-NC-SA license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by-nc-sa/4.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'nonCommercialShareAlike4.0'
      });
    });

    it('should handle different versions', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/3.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic3.0'
      });
    });

    it('should handle URLs without trailing slash', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/licenses/by/4.0');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'generic4.0'
      });
    });
  });

  describe('Creative Commons Zero (CC0)', () => {
    it('should handle CC0 license', () => {
      const result = getLicenseLabelInfo('https://creativecommons.org/publicdomain/zero/1.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.creativeCommons',
        key: 'zero1.0'
      });
    });
  });

  describe('arXiv licenses', () => {
    it('should handle arXiv assumed license', () => {
      const result = getLicenseLabelInfo('http://arxiv.org/licenses/assumed-1991-2003');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.arxiv',
        key: 'assumed'
      });
    });

    it('should handle arXiv non-exclusive license', () => {
      const result = getLicenseLabelInfo('http://arxiv.org/licenses/nonexclusive-distrib/1.0/');
      expect(result).toEqual({
        parent: 'pages.articleDetails.licenses.arxiv',
        key: 'nonExclusive'
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
