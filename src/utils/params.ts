/**
 * Utilitaire pour formater les paramètres d'URL
 */

/**
 * Convertit les paramètres de recherche en objet typé
 */
export function getFormatParams(searchParams: { [key: string]: string | string[] | undefined }) {
  const result: { [key: string]: string } = {};

  Object.entries(searchParams).forEach(([key, value]) => {
    if (typeof value === 'string') {
      result[key] = value;
    } else if (Array.isArray(value) && value.length > 0) {
      result[key] = value[0];
    }
  });

  return result;
}
