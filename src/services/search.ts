import { API_PATHS, API_URL } from '@/config/api';
import { FetchedArticle, formatArticle } from '@/utils/article';
import { PaginatedResponseWithRange, SearchRange } from '@/utils/pagination';
import { formatSearchRange } from '@/utils/search';
import { ISearchResult } from '@/types/search';
import { getJournalApiUrl } from '@/utils/env-loader';

interface SearchParams {
  terms: string;
  rvcode?: string;
  page?: number;
  itemsPerPage?: number;
  types?: string[];
  years?: number[];
  volumes?: number[];
  sections?: number[];
  authors?: string[];
}

/**
 * Récupère les résultats de recherche en fonction des critères spécifiés
 */
export async function fetchSearchResults({
  terms,
  rvcode,
  page = 1,
  itemsPerPage = 10,
  types = [],
  years = [],
  volumes = [],
  sections = [],
  authors = [],
}: SearchParams): Promise<{
  data: FetchedArticle[];
  totalItems: number;
  range?: SearchRange;
}> {
  try {
    // Construct the full URL by concatenating API_URL and search path
    const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;
    const fullUrl = `${apiRoot}${API_PATHS.search}`;
    const apiUrl = new URL(fullUrl);

    // Ajout des paramètres à l'URL
    apiUrl.searchParams.append('terms', terms);
    apiUrl.searchParams.append('page', page.toString());
    apiUrl.searchParams.append('itemsPerPage', itemsPerPage.toString());

    if (rvcode) {
      apiUrl.searchParams.append('rvcode', rvcode);
    }

    // Ajout des types
    if (types && types.length > 0) {
      types.forEach(type => {
        apiUrl.searchParams.append('type[]', type);
      });
    }

    // Ajout des années
    if (years && years.length > 0) {
      years.forEach(year => {
        apiUrl.searchParams.append('year[]', year.toString());
      });
    }

    // Ajout des volumes
    if (volumes && volumes.length > 0) {
      volumes.forEach(volume => {
        apiUrl.searchParams.append('volume_id[]', volume.toString());
      });
    }

    // Ajout des sections
    if (sections && sections.length > 0) {
      sections.forEach(section => {
        apiUrl.searchParams.append('section_id[]', section.toString());
      });
    }

    // Ajout des auteurs
    if (authors && authors.length > 0) {
      authors.forEach(author => {
        apiUrl.searchParams.append('author_fullname[]', author);
      });
    }

    const response = await fetch(apiUrl.toString(), {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      next: {
        tags: ['search'],
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch search results: ${response.status}`);
    }

    const data = await response.json();
    const searchResults = data['hydra:member'] as ISearchResult[];
    const totalItems = data['hydra:totalItems'] as number;
    const range = formatSearchRange(data['hydra:range']);

    // Récupérer les articles complets pour chaque résultat de recherche
    const fullResultsPromises = searchResults.map(async searchResult => {
      const articleId = searchResult.docid;
      try {
        const apiRoot = rvcode ? getJournalApiUrl(rvcode) : API_URL;
        const response = await fetch(`${apiRoot}${API_PATHS.papers}${articleId}`, {
          next: {
            tags: ['article', `article-${articleId}`],
          },
        });

        if (!response.ok) {
          console.warn(`Failed to fetch article with ID ${articleId}: ${response.status}`);
          return null;
        }

        const rawArticle = await response.json();
        return formatArticle(rawArticle);
      } catch (error) {
        console.warn(`Error fetching article ${articleId}`, error);
        return null;
      }
    });

    const results = await Promise.all(fullResultsPromises);
    const fullResults = results.filter((item): item is FetchedArticle => item !== null);

    return {
      data: fullResults,
      totalItems,
      range,
    };
  } catch (error) {
    console.error('Error fetching search results:', error);
    throw error;
  }
}
