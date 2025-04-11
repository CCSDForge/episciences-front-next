// Assurez-vous que l'URL de l'API se termine par /api comme dans la version React
function ensureApiEndpoint(url: string): string {
  if (!url) return '';
  return url.endsWith('/api') ? url : `${url}/api`;
}

export const API_URL = ensureApiEndpoint(process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || 'https://api-preprod.episciences.org')

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
  sections: '/sections'
  // Ajoutez d'autres chemins API au besoin
}; 