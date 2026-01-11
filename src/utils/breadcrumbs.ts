import { menuConfig, MenuItemConfig } from '@/config/menu';

export interface BreadcrumbItem {
  path: string;
  label: string;
}

/**
 * Génère la hiérarchie complète de breadcrumb pour une page donnée
 * @param currentPath - Le path de la page courante (ex: '/for-authors')
 * @param translations - Objet de traductions i18n
 * @returns Array de BreadcrumbItem incluant la catégorie parente si applicable
 */
export function getBreadcrumbHierarchy(
  currentPath: string,
  translations: Record<string, any>
): BreadcrumbItem[] {
  const breadcrumbs: BreadcrumbItem[] = [];

  // Toujours commencer par Home
  breadcrumbs.push({
    path: '/',
    label: `${translations['pages.home.title'] || 'Home'} >`,
  });

  // Chercher la page dans les menus dropdown
  const dropdownCategories = [
    { key: 'content', label: translations['common.content'] || 'Articles & Issues' },
    { key: 'about', label: translations['common.about'] || 'About' },
    { key: 'publish', label: translations['components.header.publish'] || 'Publish' },
  ];

  for (const category of dropdownCategories) {
    const items = menuConfig.dropdowns[category.key as keyof typeof menuConfig.dropdowns];
    const foundItem = items.find((item: MenuItemConfig) => item.path === currentPath);

    if (foundItem) {
      // Ajouter la catégorie parente
      breadcrumbs.push({
        path: '#', // Les dropdowns n'ont pas de page dédiée
        label: `${category.label} >`,
      });
      break;
    }
  }

  return breadcrumbs;
}
