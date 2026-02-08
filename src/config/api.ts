// Root API endpoint (server-side only or for preconnect)
export const API_ROOT_ENDPOINT =
  process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || 'https://api-preprod.episciences.org/api';

// API Domain for preconnect/dns-prefetch
export const API_DOMAIN = API_ROOT_ENDPOINT.replace(/\/api$/, '');

// Use the API root endpoint directly since it already includes /api
// Server-side: use direct API URL, Client-side: use dynamic proxy to avoid CORS
export const API_URL =
  typeof window === 'undefined' ? API_ROOT_ENDPOINT : '/api/proxy';

export const API_PATHS = {
  papers: '/papers/',
  volumes: '/volumes',
  stats: '/stats',
  links: '/links',
  statistics: '/statistics/',
  search: '/search/',
  pages: '/pages/',
  news: '/news/',
  // Ajout d'un commentaire pour clarifier le format attendu de l'URL
  // Format attendu: /journals/boards/REVUE_CODE (sans point d'interrogation ni paramètre)
  members: '/journals/boards/',
  indexation: '/pages/',
  journals: '/journals/',
  browse: '/browse/',
  sections: '/sections',
  // Ajoutez d'autres chemins API au besoin
};
