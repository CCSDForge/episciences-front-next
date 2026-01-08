import { API_URL } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';

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
  //console.log('Fetching editorial workflow page from:', url);

  try {
    const response = await fetch(url);
    //  console.log('Editorial workflow response status:', response.status);

    if (!response.ok) {
      console.error(`Failed to fetch editorial workflow page: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    //  console.log('Editorial workflow data:', data);
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    console.error('Error fetching editorial workflow page:', error);
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
  //  console.log('Fetching ethical charter page from:', url);

  try {
    const response = await fetch(url);
    //  console.log('Ethical charter response status:', response.status);

    if (!response.ok) {
      console.error(`Failed to fetch ethical charter page: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    //  console.log('Ethical charter data:', data);
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    console.error('Error fetching ethical charter page:', error);
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
  // console.log('Fetching prepare submission page from:', url);

  try {
    const response = await fetch(url);
    // console.log('Prepare submission response status:', response.status);

    if (!response.ok) {
      //  console.error(`Failed to fetch prepare submission page: ${response.statusText}`);
      return null;
    }

    const data = await response.json();
    //  console.log('Prepare submission data:', data);
    return data['hydra:member']?.[0] || null;
  } catch (error) {
    console.error('Error fetching prepare submission page:', error);
    return null;
  }
};
