/**
 * Formate le titre du site en ajoutant le nom de la revue
 * @param pageTitle Titre de la page à formater
 * @returns Titre formaté
 */
export function getFormattedSiteTitle(pageTitle: string): string {
  const siteName = process.env.NEXT_PUBLIC_SITE_NAME || 'Episciences';
  return `${pageTitle} | ${siteName}`;
} 