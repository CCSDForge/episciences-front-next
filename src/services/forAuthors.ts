import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';
import { serviceLogger } from '@/lib/logger';

const log = serviceLogger.child({ service: 'forAuthors' });

interface ForAuthorsPage {
  title: Record<string, string>;
  content: Record<string, string>;
}

/**
 * Fetch editorial workflow page content at build time
 * @param rvcode - Journal code
 * @returns Editorial workflow page data
 */
export const fetchEditorialWorkflowPage = async (
  rvcode: string
): Promise<ForAuthorsPage | null> => {
  const apiUrl = getJournalApiUrl(rvcode);
  const url = `${apiUrl}/pages?page_code=editorial-workflow&rvcode=${rvcode}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to fetch editorial workflow page');
      return null;
    }

    const data = await response.json();
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    log.error({ error }, 'Error fetching editorial workflow page');
    return null;
  }
};

/**
 * Fetch ethical charter page content at build time
 * @param rvcode - Journal code
 * @returns Ethical charter page data
 */
export const fetchEthicalCharterPage = async (rvcode: string): Promise<ForAuthorsPage | null> => {
  const apiUrl = getJournalApiUrl(rvcode);
  const url = `${apiUrl}/pages?page_code=ethical-charter&rvcode=${rvcode}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      log.error({ status: response.status }, 'Failed to fetch ethical charter page');
      return null;
    }

    const data = await response.json();
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    log.error({ error }, 'Error fetching ethical charter page');
    return null;
  }
};

/**
 * Fetch prepare submission page content at build time
 * @param rvcode - Journal code
 * @returns Prepare submission page data
 */
export const fetchPrepareSubmissionPage = async (
  rvcode: string
): Promise<ForAuthorsPage | null> => {
  const apiUrl = getJournalApiUrl(rvcode);
  const url = `${apiUrl}/pages?page_code=prepare-submission&rvcode=${rvcode}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    log.error({ error }, 'Error fetching prepare submission page');
    return null;
  }
};
