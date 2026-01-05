import { ISection } from '@/types/section';
import { formatArticle } from '@/utils/article';
import { API_URL, API_PATHS } from '@/config/api';
import { getJournalApiUrl } from '@/utils/env-loader';

interface FetchSectionParams {
  sid: string;
  rvcode?: string;
}

interface FetchSectionsParams {
  rvcode: string;
  page?: number;
  itemsPerPage?: number;
}

export async function fetchSection({ sid, rvcode }: FetchSectionParams): Promise<ISection> {
  const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;
  const response = await fetch(`${apiRoot}${API_PATHS.sections}/${sid}`, {
    next: {
      revalidate: 3600, // Section details - revalidate every hour
      tags: ['sections'] // Tag for on-demand revalidation
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch section: ${response.statusText}`);
  }

  return await response.json();
}

/**
 * Fetch sections list
 * @param params - Fetch parameters
 * @returns Sections data with pagination info
 */
export async function fetchSections({ rvcode, page = 1, itemsPerPage = 10 }: FetchSectionsParams): Promise<{ data: ISection[], totalItems: number, articlesCount: number }> {
  try {
    const apiUrl = getJournalApiUrl(rvcode);
    const response = await fetch(`${apiUrl}${API_PATHS.sections}?page=${page}&itemsPerPage=${itemsPerPage}&rvcode=${rvcode}`, {
      next: {
        revalidate: 600, // Sections list - revalidate every 10 minutes
        tags: ['sections'] // Tag for on-demand revalidation
      }
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch sections: ${response.statusText}`);
    }
    
    const baseQueryReturnValue = await response.json();
    
    const articlesCount = baseQueryReturnValue['hydra:totalPublishedArticles'];
    const totalItems = baseQueryReturnValue['hydra:totalItems'];
    const formattedData = (baseQueryReturnValue['hydra:member']).map((section: any) => ({
      ...section,
      id: section['sid'],
      title: section['titles'],
      description: section['descriptions'],
      articles: section['papers']
    }));

    return {
      data: formattedData,
      totalItems,
      articlesCount
    };
  } catch (error) {
    console.error('Error fetching sections:', error);
    return { data: [], totalItems: 0, articlesCount: 0 };
  }
}

export async function fetchSectionArticles(paperIds: string[], rvcode?: string) {
  const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;
  const articlesPromises = paperIds.map(async (docid) => {
    const response = await fetch(`${apiRoot}${API_PATHS.papers}${docid}`, {
      next: {
        revalidate: 3600, // Article data - revalidate every hour
        tags: ['articles'] // Tag for on-demand revalidation
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    const article = await response.json();
    return formatArticle(article);
  });
  
  const articles = await Promise.all(articlesPromises);
  return articles.filter(Boolean);
} 