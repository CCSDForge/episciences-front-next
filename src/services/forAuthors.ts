import { getJournalApiUrl } from '@/utils/env-loader';
import { safeFetchData } from '@/utils/api-error-handler';
import { CACHE_TTL } from '@/utils/cache-ttl';

export interface ForAuthorsPage {
  title: Record<string, string>;
  content: Record<string, string>;
  date_updated?: string;
}

export async function fetchEditorialWorkflowPage(rvcode: string): Promise<ForAuthorsPage | null> {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData<ForAuthorsPage | null>(
    async () => {
      const response = await fetch(
        `${apiUrl}/pages?page_code=editorial-workflow&rvcode=${rvcode}`,
        {
          next: {
            revalidate: CACHE_TTL.pages,
            tags: ['editorial-workflow', `editorial-workflow-${rvcode}`],
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data['hydra:member']?.[0] || null;
    },
    null,
    `fetchEditorialWorkflowPage(${rvcode})`
  );
}

export async function fetchEthicalCharterPage(rvcode: string): Promise<ForAuthorsPage | null> {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData<ForAuthorsPage | null>(
    async () => {
      const response = await fetch(`${apiUrl}/pages?page_code=ethical-charter&rvcode=${rvcode}`, {
        next: {
          revalidate: CACHE_TTL.pages,
          tags: ['ethical-charter', `ethical-charter-${rvcode}`],
        },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data['hydra:member']?.[0] || null;
    },
    null,
    `fetchEthicalCharterPage(${rvcode})`
  );
}

export async function fetchPrepareSubmissionPage(rvcode: string): Promise<ForAuthorsPage | null> {
  const apiUrl = getJournalApiUrl(rvcode);
  return safeFetchData<ForAuthorsPage | null>(
    async () => {
      const response = await fetch(
        `${apiUrl}/pages?page_code=prepare-submission&rvcode=${rvcode}`,
        {
          next: {
            revalidate: CACHE_TTL.pages,
            tags: ['prepare-submission', `prepare-submission-${rvcode}`],
          },
        }
      );
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      return data['hydra:member']?.[0] || null;
    },
    null,
    `fetchPrepareSubmissionPage(${rvcode})`
  );
}
