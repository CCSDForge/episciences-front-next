import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  fetchEditorialWorkflowPage,
  fetchEthicalCharterPage,
  fetchPrepareSubmissionPage,
} from '../forAuthors';

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn((rvcode: string) => `https://api.${rvcode}.test`),
}));

vi.mock('@/config/api', () => ({
  API_URL: 'https://api.test',
}));

const mockFetch = vi.fn();
global.fetch = mockFetch;

const createMockResponse = (data: unknown, ok = true, statusText = 'OK') => ({
  ok,
  statusText,
  json: () => Promise.resolve(data),
});

const mockPageData = {
  title: { en: 'Editorial Workflow', fr: 'Processus éditorial' },
  content: { en: '<p>Content</p>', fr: '<p>Contenu</p>' },
};

describe('forAuthors service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('fetchEditorialWorkflowPage', () => {
    it('should return editorial workflow page data on success', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [mockPageData] })
      );

      const result = await fetchEditorialWorkflowPage('myjournal');

      expect(result).toEqual(mockPageData);
    });

    it('should request page_code=editorial-workflow', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [mockPageData] })
      );

      await fetchEditorialWorkflowPage('myjournal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page_code=editorial-workflow');
    });

    it('should include rvcode in request URL', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [mockPageData] })
      );

      await fetchEditorialWorkflowPage('myjournal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('rvcode=myjournal');
    });

    it('should return null when hydra:member is empty', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [] })
      );

      const result = await fetchEditorialWorkflowPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API returns non-ok status', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false, 'Not Found'));

      const result = await fetchEditorialWorkflowPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null on network error', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchEditorialWorkflowPage('myjournal');

      expect(result).toBeNull();
    });
  });

  describe('fetchEthicalCharterPage', () => {
    it('should return ethical charter page data on success', async () => {
      const ethicalData = { title: { en: 'Ethics' }, content: { en: '<p>Ethics</p>' } };
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [ethicalData] })
      );

      const result = await fetchEthicalCharterPage('myjournal');

      expect(result).toEqual(ethicalData);
    });

    it('should request page_code=ethical-charter', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [mockPageData] })
      );

      await fetchEthicalCharterPage('myjournal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page_code=ethical-charter');
    });

    it('should return null when API is down', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchEthicalCharterPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when response is non-ok', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchEthicalCharterPage('myjournal');

      expect(result).toBeNull();
    });
  });

  describe('fetchPrepareSubmissionPage', () => {
    it('should return prepare submission page data on success', async () => {
      const submissionData = { title: { en: 'Prepare' }, content: { en: '<p>Prepare</p>' } };
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [submissionData] })
      );

      const result = await fetchPrepareSubmissionPage('myjournal');

      expect(result).toEqual(submissionData);
    });

    it('should request page_code=prepare-submission', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [mockPageData] })
      );

      await fetchPrepareSubmissionPage('myjournal');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('page_code=prepare-submission');
    });

    it('should return null when hydra:member is empty', async () => {
      mockFetch.mockResolvedValue(
        createMockResponse({ 'hydra:member': [] })
      );

      const result = await fetchPrepareSubmissionPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when API is down', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));

      const result = await fetchPrepareSubmissionPage('myjournal');

      expect(result).toBeNull();
    });

    it('should return null when response is non-ok', async () => {
      mockFetch.mockResolvedValue(createMockResponse(null, false));

      const result = await fetchPrepareSubmissionPage('myjournal');

      expect(result).toBeNull();
    });
  });
});
