export const PATHS = {
  home: '',
  boards: 'boards',
  search: 'search',
  articles: 'articles',
  articleDetails: 'articleDetails',
  articleDetailsMetadata: 'articleDetailsMetadata',
  articleDetailsPreview: 'articleDetailsPreview',
  articleDetailsNotice: 'articleDetailsNotice',
  articleDetailsDownload: 'articleDetailsDownload',
  articlesAccepted: '/articles-accepted',
  authors: 'authors',
  volumes: 'volumes',
  volumeDetails: 'volumeDetails',
  sections: '/sections',
  sectionDetails: '/sections/:id',
  about: 'about',
  acknowledgements: 'acknowledgements',
  indexing: 'indexing',
  credits: 'credits',
  news: 'news',
  statistics: '/statistics',
  forAuthors: 'for-authors',
  ethicalCharter: 'ethical-charter',
  forReviewers: 'for-reviewers',
  forConferenceOrganisers: 'for-conference-organisers',
} as const;

export type PathsType = keyof typeof PATHS;

export const BREADCRUMB_PATHS = {
  home: PATHS.home,
  articles: PATHS.articles,
  articleDetails: (id: string) => `${PATHS.articles}/${id}`,
} as const;
