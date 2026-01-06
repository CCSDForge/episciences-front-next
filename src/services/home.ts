import { API_PATHS } from '@/config/api';
import { IBoardMember } from '@/types/board';
import { INews } from '@/types/news';
import { IVolume } from '@/types/volume';
import { IStat } from '@/types/stat';
import { FetchedArticle, formatArticle } from '@/utils/article';
import { transformArticleForDisplay } from './article';
import { formatVolume } from '@/utils/volume';
import { AvailableLanguage } from '@/utils/i18n';
import { getJournalApiUrl } from '@/utils/env-loader';

// Paramètres pour les retries
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 seconde

// Fonction fetchWithRetry pour les appels API
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

// Interface PageContent pour les pages about et indexation
interface PageContent {
  id: number;
  page_code: string;
  rvcode: string;
  title: {
    en: string;
    fr: string;
  };
  content: {
    en: string;
    fr: string;
  };
}

// Interface pour les réponses de collection de l'API
interface HydraCollection<T> {
  'hydra:member': T[];
  'hydra:totalItems': number;
}

export interface HomeData {
  aboutPage?: PageContent;
  articles?: {
    data: FetchedArticle[];
    totalItems: number;
  };
  news?: {
    data: INews[];
    totalItems: number;
  };
  members?: IBoardMember[];
  stats?: IStat[];
  indexation?: PageContent;
  volumes?: {
    data: IVolume[];
    totalItems: number;
  };
  issues?: {
    data: IVolume[];
    totalItems: number;
  };
  acceptedArticles?: {
    data: FetchedArticle[];
    totalItems: number;
  };
}

// Vérifie si l'URL de l'API se termine par /api et l'ajoute si nécessaire
function ensureApiEndpoint(baseUrl: string): string {
  if (!baseUrl) return '';
  const url = baseUrl.endsWith('/api') ? baseUrl : `${baseUrl}/api`;
  return url;
}

// Transformation des membres du board pour normaliser la structure des rôles
function transformBoardMembers(members: any[]): IBoardMember[] {
  return members.map((member: any) => {
    // Transformer les rôles comme dans RTK Query: aplatir les tableaux imbriqués et remplacer _ par -
    const roles = (member.roles && member.roles.length > 0) 
      ? member.roles[0].map((role: string) => role.replace(/_/g, '-')) 
      : [];
    
    // Traiter les autres propriétés comme dans fetchBoardMembers et board.query.ts
    let twitter, mastodon;
    if (member.additionalProfileInformation?.socialMedias) {
      const atCount = (member.additionalProfileInformation?.socialMedias.match(/@/g) || []).length;
      
      if (atCount === 1) {
        twitter = `${process.env.NEXT_PUBLIC_TWITTER_HOMEPAGE}/${member.additionalProfileInformation?.socialMedias.slice(1)}`;
      }
      else if (atCount > 1) {
        const parts = member.additionalProfileInformation?.socialMedias.split('@');
        mastodon = `https://${parts[2]}/@${parts[1]}`;
      }
    }

    return {
      ...member,
      id: member.id || member.uid || 0,
      biography: member.additionalProfileInformation?.biography || '',
      roles,
      affiliations: member.additionalProfileInformation?.affiliations || [],
      assignedSections: (member.assignedSections || []).map((section: any) => ({
        sid: section.sid,
        title: section.titles || { en: '', fr: '' },
        titles: section.titles || { en: '', fr: '' }
      })),
      twitter,
      mastodon,
      website: member.additionalProfileInformation?.webSites 
        ? member.additionalProfileInformation.webSites[0] 
        : undefined
    };
  });
}

export async function fetchHomeData(rvcode: string, language: string): Promise<HomeData> {
  try {
    const apiBaseUrl = ensureApiEndpoint(getJournalApiUrl(rvcode));

    // Créer les promesses pour tous les appels API en parallèle
    const aboutPagePromise = fetch(`${apiBaseUrl}${API_PATHS.pages}?page_code=about&rvcode=${rvcode}`)
      .then(res => res.ok ? res.json() : null);

    const articlesPromise = fetch(`${apiBaseUrl}${API_PATHS.papers}?page=1&itemsPerPage=20&rvcode=${rvcode}`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    const newsPromise = fetch(`${apiBaseUrl}${API_PATHS.news}?page=1&itemsPerPage=3&rvcode=${rvcode}`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    // Correction du chemin pour récupérer les membres correctement
    const membersPromise = fetch(`${apiBaseUrl}${API_PATHS.members}${rvcode}`)
      .then(res => {
     // console.log(`Fetching board members from home with URL: ${apiBaseUrl}${API_PATHS.members}${rvcode}, status: ${res.status}`);
      // Le endpoint des membres peut retourner directement un tableau au lieu d'une collection Hydra
      return res.ok ? res.json().then(data => {
      //  console.log(`Successfully fetched board members from home, count: ${Array.isArray(data) ? data.length : 'N/A'}`);
        if (Array.isArray(data)) {
          return { 'hydra:member': data, 'hydra:totalItems': data.length };
        }
        return data;
      }) : { 'hydra:member': [], 'hydra:totalItems': 0 };
    });

    const statsPromise = fetch(`${apiBaseUrl}${API_PATHS.statistics}?page=1&itemsPerPage=3&rvcode=${rvcode}`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    const indexationPromise = fetch(`${apiBaseUrl}${API_PATHS.pages}?page_code=journal-indexing&rvcode=${rvcode}`)
      .then(res => res.ok ? res.json() : null);

    const volumesPromise = fetch(`${apiBaseUrl}${API_PATHS.volumes}?page=1&itemsPerPage=2&rvcode=${rvcode}&language=${language}`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    const issuesPromise = fetch(`${apiBaseUrl}${API_PATHS.volumes}?page=1&itemsPerPage=2&rvcode=${rvcode}&language=${language}&types[]=special_issue`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    const acceptedArticlesPromise = fetch(`${apiBaseUrl}${API_PATHS.papers}?page=1&itemsPerPage=20&rvcode=${rvcode}&only_accepted=true`)
      .then(res => res.ok ? res.json() : { 'hydra:member': [], 'hydra:totalItems': 0 });

    // Attendre tous les résultats
    const [
      aboutPageResponse,
      articlesResponse,
      newsResponse,
      membersResponse,
      statsResponse,
      indexationResponse,
      volumesResponse,
      issuesResponse,
      acceptedArticlesResponse
    ] = await Promise.all([
      aboutPagePromise,
      articlesPromise,
      newsPromise,
      membersPromise,
      statsPromise,
      indexationPromise,
      volumesPromise,
      issuesPromise,
      acceptedArticlesPromise
    ]);

    // Transformer les réponses comme le ferait RTK Query
    const aboutPage = aboutPageResponse?.['hydra:member']?.[0] || null;
    const indexation = indexationResponse?.['hydra:member']?.[0] || null;

    // Récupérer les articles complets avec appels individuels, comme dans la version React
    const formattedArticles = await Promise.all(
      (articlesResponse?.['hydra:member'] || []).map(async (partialArticle: any) => {
        try {
          const articleId = partialArticle.paperid;
          const rawArticle = await fetchWithRetry(`${apiBaseUrl}${API_PATHS.papers}${articleId}`).then((res: Response) => res.json());
          return formatArticle(rawArticle);
        } catch (error) {
          console.error(`Erreur lors de la récupération de l'article ${partialArticle.paperid}:`, error);
          // Retourner un article minimal pour éviter les erreurs
          return {
            id: Number(partialArticle.paperid),
            title: partialArticle.title || `Article ${partialArticle.paperid}`,
            authors: [],
            publicationDate: '',
            tag: '',
            repositoryName: '',
            repositoryIdentifier: '',
            doi: partialArticle.doi || '',
            abstract: '',
            pdfLink: '',
            metrics: { views: 0, downloads: 0 }
          };
        }
      })
    );
    
    // Récupérer les articles acceptés complets avec appels individuels
    const formattedAcceptedArticles = await Promise.all(
      (acceptedArticlesResponse?.['hydra:member'] || []).map(async (partialArticle: any) => {
        try {
          const articleId = partialArticle.paperid;
          const rawArticle = await fetchWithRetry(`${apiBaseUrl}${API_PATHS.papers}${articleId}`).then((res: Response) => res.json());
          return formatArticle(rawArticle);
        } catch (error) {
          console.error(`Erreur lors de la récupération de l'article accepté ${partialArticle.paperid}:`, error);
          // Retourner un article minimal pour éviter les erreurs
          return {
            id: Number(partialArticle.paperid),
            title: partialArticle.title || `Article ${partialArticle.paperid}`,
            authors: [],
            publicationDate: '',
            tag: '',
            repositoryName: '',
            repositoryIdentifier: '',
            doi: partialArticle.doi || '',
            abstract: '',
            pdfLink: '',
            metrics: { views: 0, downloads: 0 }
          };
        }
      })
    );

    // Transformer les membres du board
    const transformedMembers = transformBoardMembers(membersResponse?.['hydra:member'] || []);
    
  //  console.log('Home data fetched successfully. Articles count:', formattedArticles.length);
  //  console.log('First 3 articles from API:', formattedArticles.slice(0, 3));
  //  console.log('Board members count:', transformedMembers.length);
    
    // Formater les issues pour qu'ils aient la bonne structure (comme dans la version originale)
    const formattedIssues = (issuesResponse?.['hydra:member'] || []).map((rawVolume: any) => 
      formatVolume(rvcode, language as AvailableLanguage, rawVolume)
    );

    return {
      aboutPage,
      articles: {
        data: formattedArticles,
        totalItems: articlesResponse?.['hydra:totalItems'] || 0
      },
      news: {
        data: newsResponse?.['hydra:member'] || [],
        totalItems: newsResponse?.['hydra:totalItems'] || 0
      },
      members: transformedMembers,
      stats: statsResponse?.['hydra:member'] || [],
      indexation,
      volumes: {
        data: volumesResponse?.['hydra:member'] || [],
        totalItems: volumesResponse?.['hydra:totalItems'] || 0
      },
      issues: {
        data: formattedIssues,
        totalItems: issuesResponse?.['hydra:totalItems'] || 0
      },
      acceptedArticles: {
        data: formattedAcceptedArticles,
        totalItems: acceptedArticlesResponse?.['hydra:totalItems'] || 0
      }
    };
  } catch (error) {
    console.error('Error fetching home data:', error);
    return {}; // Retourner un objet vide en cas d'erreur
  }
} 