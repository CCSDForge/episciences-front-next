/**
 * Menu configuration for the Episciences application
 * Supports hierarchical dropdown structure with conditional rendering based on environment variables
 */

export interface MenuItemConfig {
  key: string;
  label: string; // i18n key (e.g., 'components.header.links.articles')
  path: string;
  envKey?: string; // Environment variable suffix (without NEXT_PUBLIC_JOURNAL_MENU_ prefix)
  alwaysVisible?: boolean; // If true, item is always visible regardless of env vars
}

export interface MenuStructure {
  dropdowns: {
    content: MenuItemConfig[];
    about: MenuItemConfig[];
    publish: MenuItemConfig[];
  };
  standalone: MenuItemConfig[];
}

/**
 * Complete menu configuration following React app structure
 * Organized by dropdown sections: Content, About, Publish
 */
export const menuConfig: MenuStructure = {
  dropdowns: {
    // CONTENT Dropdown - Articles, Volumes, Sections, Authors
    content: [
      {
        key: 'ARTICLES',
        label: 'components.header.links.articles',
        path: '/articles',
        alwaysVisible: true,
      },
      {
        key: 'ACCEPTED_ARTICLES',
        label: 'components.header.links.articlesAccepted',
        path: '/articles-accepted',
        envKey: 'ACCEPTED_ARTICLES',
      },
      {
        key: 'VOLUMES',
        label: 'components.header.links.volumes',
        path: '/volumes',
        envKey: 'VOLUMES',
      },
      {
        key: 'LAST_VOLUME',
        label: 'components.header.links.lastVolume',
        path: '/volumes/:lastVolumeId', // Replaced dynamically with actual volume ID
        envKey: 'LAST_VOLUME',
      },
      {
        key: 'SECTIONS',
        label: 'components.header.links.sections',
        path: '/sections',
        envKey: 'SECTIONS',
      },
      {
        key: 'SPECIAL_ISSUES',
        label: 'components.header.links.specialIssues',
        path: '/volumes?type=special_issue',
        envKey: 'SPECIAL_ISSUES',
      },
      {
        key: 'PROCEEDINGS',
        label: 'components.header.links.proceedings',
        path: '/volumes?type=proceedings',
        envKey: 'VOLUME_TYPE_PROCEEDINGS',
      },
      {
        key: 'AUTHORS',
        label: 'components.header.links.authors',
        path: '/authors',
        alwaysVisible: true,
      },
    ],

    // ABOUT Dropdown - About, Acknowledgements, Indexing, News, Statistics
    about: [
      {
        key: 'ABOUT',
        label: 'components.header.links.about',
        path: '/about',
        alwaysVisible: true,
      },
      {
        key: 'ACKNOWLEDGEMENTS',
        label: 'components.header.links.acknowledgements',
        path: '/acknowledgements',
        envKey: 'JOURNAL_ACKNOWLEDGEMENTS',
      },
      {
        key: 'INDEXING',
        label: 'components.header.links.indexing',
        path: '/indexing',
        envKey: 'JOURNAL_INDEXING',
      },
      {
        key: 'NEWS',
        label: 'components.header.links.news',
        path: '/news',
        envKey: 'NEWS',
      },
      {
        key: 'STATISTICS',
        label: 'components.header.links.statistics',
        path: '/statistics',
        envKey: 'STATISTICS',
      },
    ],

    // PUBLISH Dropdown - For Authors, Ethical Charter, For Reviewers, For Conference Organisers
    publish: [
      {
        key: 'FOR_AUTHORS',
        label: 'components.header.links.forAuthors',
        path: '/for-authors',
        envKey: 'FOR_AUTHORS',
      },
      {
        key: 'ETHICAL_CHARTER',
        label: 'components.header.links.ethicalCharter',
        path: '/ethical-charter',
        envKey: 'JOURNAL_ETHICAL_CHARTER',
      },
      {
        key: 'FOR_REVIEWERS',
        label: 'components.header.links.forReviewers',
        path: '/for-reviewers',
        envKey: 'JOURNAL_FOR_REVIEWERS',
      },
      {
        key: 'FOR_CONFERENCE_ORGANISERS',
        label: 'components.header.links.forConferenceOrganisers',
        path: '/for-conference-organisers',
        envKey: 'JOURNAL_FOR_CONFERENCE_ORGANISERS',
      },
    ],
  },

  // Standalone menu items (not in dropdowns)
  standalone: [
    {
      key: 'BOARDS',
      label: 'components.header.links.boards',
      path: '/boards',
      envKey: 'BOARDS',
    },
  ],
};

/**
 * Check if a menu item should be rendered based on environment variables
 * @param item - Menu item configuration
 * @returns true if item should be displayed, false otherwise
 */
export const shouldRenderMenuItem = (item: MenuItemConfig): boolean => {
  // Always visible items bypass env var checks
  if (item.alwaysVisible) {
    return true;
  }

  // If no env key specified, item is visible by default
  if (!item.envKey) {
    return true;
  }

  // Check environment variable: NEXT_PUBLIC_JOURNAL_MENU_{envKey}_RENDER
  const envValue = process.env[`NEXT_PUBLIC_JOURNAL_MENU_${item.envKey}_RENDER`];

  // Default behavior: undefined or 'true' → show item, 'false' → hide item
  return envValue === undefined || envValue === 'true';
};

/**
 * Filter menu items to return only visible ones based on environment configuration
 * @param items - Array of menu item configurations
 * @returns Filtered array of visible menu items
 */
export const getVisibleMenuItems = (items: MenuItemConfig[]): MenuItemConfig[] => {
  return items.filter(shouldRenderMenuItem);
};

/**
 * Process menu item path by replacing dynamic placeholders with actual values
 * @param item - Menu item configuration
 * @param replacements - Object mapping placeholder keys to values (e.g., {lastVolumeId: '123'})
 * @returns Menu item with processed path
 */
export const processMenuItemPath = (
  item: MenuItemConfig,
  replacements: Record<string, string>
): MenuItemConfig => {
  let path = item.path;

  // Replace all placeholders in the format :key with their values
  Object.entries(replacements).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });

  return { ...item, path };
};
