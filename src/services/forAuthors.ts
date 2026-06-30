import { logger } from '@/lib/logger';
import { getJournalApiUrl } from '@/utils/env-loader';

const log = logger.child({ service: 'for-authors' });

export interface ForAuthorsPage {
  title: Record<string, string>;
  content: Record<string, string>;
  date_updated?: string;
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
      log.error(`Failed to fetch editorial workflow page: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    log.error('Error fetching editorial workflow page:', error);
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
      log.error(`Failed to fetch ethical charter page: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    log.error('Error fetching ethical charter page:', error);
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
    log.error('Error fetching prepare submission page:', error);
    return null;
  }
};
