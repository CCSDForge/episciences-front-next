import { apiCall, fetchPaginatedResults } from './api.helper';
import { getJournalApiUrl } from '@/utils/env-loader';

export interface IFacetAuthor {
  '@id': string;
  values: IAuthor;
}

export interface IAuthor {
  id: string;
  name: string;
  count: number;
}

export interface IAuthorArticle {
  id: number;
  title: string;
  publicationDate: string;
  doi?: string;
}

export type RawAuthorArticle = {
  paperid: number;
  paper_title_t: string[];
  publication_date_tdate: string;
  doi_s?: string;
}

export interface PaginatedResponseWithAuthorsRange<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
  'hydra:range'?: Record<string, number>;
}

export interface PaginatedResponse<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
}

/**
 * Transformer pour convertir les données brutes d'auteurs en format standardisé
 */
const authorTransformer = (author: IFacetAuthor): IAuthor => ({
  id: author['@id'],
  name: author['values']['name'],
  count: author['values']['count']
});

/**
 * Transformer pour convertir les données brutes d'articles d'auteur en format standardisé
 */
const authorArticleTransformer = (article: RawAuthorArticle): IAuthorArticle => ({
  id: article['paperid'],
  title: article['paper_title_t'][0],
  publicationDate: article['publication_date_tdate'],
  doi: article['doi_s']
});

export async function fetchAuthors({
  rvcode,
  page = 1,
  itemsPerPage = 10,
  search = '',
  letter = ''
}: {
  rvcode: string;
  page?: number;
  itemsPerPage?: number;
  search?: string;
  letter?: string;
}): Promise<{ data: IAuthor[]; totalItems: number; range?: Record<string, number>; rvcode: string; journalName?: string }> {
  try {
    // Construction de l'URL comme dans la version originale
    const baseUrl = `browse/authors/?page=${page}&itemsPerPage=${itemsPerPage}&code=${rvcode}`;
    let queryParams = '';
    
    if (search) queryParams += `&search=${search}`;
    if (letter) queryParams += `&letter=${letter}`;
    
    const endpoint = `${baseUrl}${queryParams}`;
    
    const apiRoot = getJournalApiUrl(rvcode);
    
    // Utiliser le helper API pour faire l'appel
    const response = await apiCall<PaginatedResponseWithAuthorsRange<IFacetAuthor>>(
      endpoint,
      {
        apiRoot,
        headers: {
          'Accept': 'application/ld+json'
        }
      }
    );

    // Transformer les données
    const data = response['hydra:member'].map(authorTransformer);
    const totalItems = response['hydra:totalItems'];
    const range = response['hydra:range'];

    return {
      data,
      totalItems,
      range,
      rvcode,
      // Dans une version future, on pourrait récupérer le nom du journal ici
      journalName: undefined
    };
  } catch (error) {
    console.error('Error fetching authors:', error);
    return {
      data: [],
      totalItems: 0,
      rvcode
    };
  }
}

export async function fetchAuthorArticles({
  rvcode,
  fullname
}: {
  rvcode: string;
  fullname: string;
}): Promise<{ data: IAuthorArticle[]; totalItems: number }> {
  try {
    // Construction de l'URL comme dans la version originale
    const endpoint = `browse/authors-search/${fullname}?pagination=false&code=${rvcode}`;
    
    const apiRoot = getJournalApiUrl(rvcode);

    // Utiliser le helper API
    const response = await apiCall<PaginatedResponse<RawAuthorArticle>>(
      endpoint,
      {
        apiRoot,
        headers: {
          'Accept': 'application/ld+json'
        }
      }
    );

    // Transformer les données
    const data = response['hydra:member'].map(authorArticleTransformer);
    const totalItems = response['hydra:totalItems'];

    return {
      data,
      totalItems
    };
  } catch (error) {
    console.error('Error fetching author articles:', error);
    return {
      data: [],
      totalItems: 0
    };
  }
} 