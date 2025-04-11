import { API_URL, API_PATHS } from '@/config/api'
import { FetchedArticle, METADATA_TYPE, formatArticle } from '@/utils/article'
import { RawArticle } from '@/types/article'

interface FetchArticlesParams {
  rvcode: string
  page: number
  itemsPerPage: number
  onlyAccepted?: boolean
  types?: string[]
  years?: number[]
  articleIds?: string[]
}

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde

async function fetchWithRetry(url: string, options: RequestInit = {}, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response;
  } catch (error) {
    if (retries > 0) {
    //  console.log(`Tentative de reconnexion pour ${url}, ${retries} tentatives restantes`);
      await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
      return fetchWithRetry(url, options, retries - 1);
    }
    throw error;
  }
}

export async function fetchArticles({ rvcode, page, itemsPerPage, onlyAccepted = false, types, years, articleIds }: FetchArticlesParams) {
  const params = new URLSearchParams({
    page: page.toString(),
    itemsPerPage: itemsPerPage.toString(),
    rvcode: process.env.NEXT_PUBLIC_JOURNAL_RVCODE || rvcode
  })

  if (onlyAccepted) {
    params.append('only_accepted', 'true')
  }

  if (types && types.length > 0) {
    types.forEach(type => params.append('type[]', type))
  }
  
  if (years && years.length > 0) {
    years.forEach(year => params.append('year[]', year.toString()))
  }

  if (articleIds && articleIds.length > 0) {
    articleIds.forEach(id => params.append('id[]', id))
  }

  try {
    const response = await fetchWithRetry(`${API_URL}${API_PATHS.papers}?${params}`)

    const data = await response.json()
    
    // Récupérer les articles complets avec gestion des erreurs
    const fullArticles = await Promise.allSettled(
      data['hydra:member'].map(async (partialArticle: any) => {
        try {
          const articleId = partialArticle.paperid
          const rawArticle = await fetchRawArticle(articleId)
          return formatArticle(rawArticle)
        } catch (error) {
          console.error(`Erreur lors de la récupération de l'article ${partialArticle.paperid}:`, error)
          return null
        }
      })
    )

    return {
      data: fullArticles
        .filter((result): result is PromiseFulfilledResult<FetchedArticle> => 
          result.status === 'fulfilled' && result.value !== null
        )
        .map(result => result.value),
      totalItems: data['hydra:totalItems'],
      range: data['hydra:range'] ? {
        years: data['hydra:range'].publicationYears
      } : undefined
    }
  } catch (error) {
    console.error('Erreur lors de la récupération des articles:', error)
    return {
      data: [],
      totalItems: 0,
      range: undefined
    }
  }
}

export interface ArticleAcceptedFilter {
  type?: string;
  tagged?: string[];
}

export async function fetchAcceptedArticles(
  page: number = 1,
  filters: ArticleAcceptedFilter = {}
): Promise<{
  articles: FetchedArticle[];
  total: number;
  types: string[];
}> {
  const queryParams = new URLSearchParams();
  queryParams.append('page', page.toString());
  
  if (filters.type) {
    queryParams.append('type', filters.type);
  }
  
  if (filters.tagged && filters.tagged.length > 0) {
    filters.tagged.forEach(tag => {
      queryParams.append('tagged[]', tag);
    });
  }
  
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/articles/accepted?${queryParams.toString()}`
  );
  
  if (!response.ok) {
    throw new Error('Failed to fetch accepted articles');
  }
  
  const data = await response.json();
  
  return {
    articles: data.articles.map(formatArticle),
    total: data.total,
    types: data.types || [],
  };
}

/**
 * Récupère un article brut par son ID
 */
async function fetchRawArticle(paperid: string | number): Promise<RawArticle> {
  const response = await fetchWithRetry(`${API_URL}${API_PATHS.papers}${paperid}`)
  return response.json()
}

/**
 * Récupère un article formaté par son ID
 */
export async function fetchArticle(paperid: string): Promise<FetchedArticle | null> {
  try {
    const response = await fetchWithRetry(`${API_URL}${API_PATHS.papers}${paperid}`);
    const rawArticle: RawArticle = await response.json();
    return formatArticle(rawArticle);
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${paperid}:`, error);
    return null;
  }
}

/**
 * Récupère les métadonnées d'un article dans un format spécifique
 */
export async function fetchArticleMetadata({ rvcode, paperid, type }: { rvcode: string, paperid: string, type: string }): Promise<string | null> {
  try {
    const response = await fetchWithRetry(
      `${API_URL}${API_PATHS.papers}export/${paperid}/${type}?code=${process.env.NEXT_PUBLIC_JOURNAL_RVCODE || rvcode}`
    );
    
    return response.text();
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${paperid}:`, error);
    return null;
  }
}

/**
 * Fonction pour transformer les articles bruts de l'API en structure attendue par les composants
 * Cette fonction est utile pour les pages qui ne passent pas par RTK Query et ont besoin
 * de transformer les données manuellement.
 */
export function transformArticleForDisplay(rawArticle: any): FetchedArticle {
  // Si l'article est déjà formaté avec un id et title, on le retourne tel quel
  if (rawArticle && typeof rawArticle === 'object' && rawArticle.id && rawArticle.title) {
    return rawArticle;
  }

  // Si l'article est au format brut de l'API (@id, paperid, etc.)
  if (rawArticle && typeof rawArticle === 'object' && rawArticle['@id']) {
    try {
      // Utilise la fonction formatArticle du utils/article.ts
      const formattedArticle = formatArticle(rawArticle);
      if (formattedArticle) {
        return formattedArticle;
      } else {
        // Création d'un article minimal avec les données disponibles
        return createMinimalArticle(rawArticle);
      }
    } catch (error) {
      console.error('Error formatting article:', error);
      
      // Création d'un article minimal si le formatage échoue
      return createMinimalArticle(rawArticle);
    }
  }

  // Si on ne peut pas formater l'article, on retourne undefined
  return undefined;
}

/**
 * Crée un article minimal à partir des données brutes pour éviter les erreurs d'affichage
 */
function createMinimalArticle(rawArticle: any): FetchedArticle {
  if (!rawArticle) return undefined;
  
  return {
    id: Number(rawArticle.paperid) || rawArticle.docid,
    title: rawArticle.document?.journal?.journal_article?.titles?.title || 
           `Article ${rawArticle.paperid || rawArticle.docid}`,
    authors: [],
    publicationDate: '',
    tag: '',
    repositoryName: '',
    repositoryIdentifier: '',
    doi: rawArticle.doi || '',
    abstract: '',
    pdfLink: '',
    metrics: { views: 0, downloads: 0 }
  };
}

/**
 * Récupère un article par son ID
 */
export async function getArticleById(id: string | number): Promise<FetchedArticle> {
  try {
    const apiRoot = process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || '';
    const response = await fetch(`${apiRoot}${API_PATHS.papers}/${id}`);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch article. Status: ${response.status}`);
    }
    
    const rawArticle = await response.json();
    return transformArticleForDisplay(rawArticle);
  } catch (error) {
    console.error('Error fetching article:', error);
    return undefined;
  }
} 