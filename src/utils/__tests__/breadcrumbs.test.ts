import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getBreadcrumbHierarchy } from '../breadcrumbs';

// Mock menu.ts
vi.mock('@/config/menu', () => ({
  menuConfig: {
    dropdowns: {
      content: [
        { key: 'ARTICLES', label: 'components.header.links.articles', path: '/articles' },
        { key: 'VOLUMES', label: 'components.header.links.volumes', path: '/volumes' },
        { key: 'AUTHORS', label: 'components.header.links.authors', path: '/authors' },
      ],
      about: [
        { key: 'ABOUT', label: 'components.header.links.about', path: '/about' },
        {
          key: 'ACKNOWLEDGEMENTS',
          label: 'components.header.links.acknowledgements',
          path: '/acknowledgements',
        },
        { key: 'NEWS', label: 'components.header.links.news', path: '/news' },
      ],
      publish: [
        { key: 'FOR_AUTHORS', label: 'components.header.links.forAuthors', path: '/for-authors' },
        {
          key: 'ETHICAL_CHARTER',
          label: 'components.header.links.ethicalCharter',
          path: '/ethical-charter',
        },
        {
          key: 'FOR_REVIEWERS',
          label: 'components.header.links.forReviewers',
          path: '/for-reviewers',
        },
        {
          key: 'FOR_CONFERENCE_ORGANISERS',
          label: 'components.header.links.forConferenceOrganisers',
          path: '/for-conference-organisers',
        },
      ],
    },
    standalone: [{ key: 'BOARDS', label: 'components.header.links.boards', path: '/boards' }],
  },
}));

describe('getBreadcrumbHierarchy', () => {
  const mockTranslations = {
    'pages.home.title': 'Home',
    'common.content': 'Articles & Issues',
    'common.about': 'About',
    'components.header.publish': 'Publish',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Publish category pages', () => {
    it('generates correct breadcrumb for /for-authors', () => {
      const result = getBreadcrumbHierarchy('/for-authors', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });

    it('generates correct breadcrumb for /ethical-charter', () => {
      const result = getBreadcrumbHierarchy('/ethical-charter', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });

    it('generates correct breadcrumb for /for-reviewers', () => {
      const result = getBreadcrumbHierarchy('/for-reviewers', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });

    it('generates correct breadcrumb for /for-conference-organisers', () => {
      const result = getBreadcrumbHierarchy('/for-conference-organisers', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });
  });

  describe('Content category pages', () => {
    it('generates correct breadcrumb for /articles', () => {
      const result = getBreadcrumbHierarchy('/articles', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Articles & Issues >' });
    });

    it('generates correct breadcrumb for /volumes', () => {
      const result = getBreadcrumbHierarchy('/volumes', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Articles & Issues >' });
    });

    it('generates correct breadcrumb for /authors', () => {
      const result = getBreadcrumbHierarchy('/authors', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Articles & Issues >' });
    });
  });

  describe('About category pages', () => {
    it('generates correct breadcrumb for /about', () => {
      const result = getBreadcrumbHierarchy('/about', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'About >' });
    });

    it('generates correct breadcrumb for /acknowledgements', () => {
      const result = getBreadcrumbHierarchy('/acknowledgements', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'About >' });
    });

    it('generates correct breadcrumb for /news', () => {
      const result = getBreadcrumbHierarchy('/news', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'About >' });
    });
  });

  describe('Standalone pages', () => {
    it('generates only Home breadcrumb for /boards (standalone page)', () => {
      const result = getBreadcrumbHierarchy('/boards', mockTranslations);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
    });
  });

  describe('Unknown pages', () => {
    it('generates only Home breadcrumb for unknown path', () => {
      const result = getBreadcrumbHierarchy('/unknown-page', mockTranslations);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
    });

    it('generates only Home breadcrumb for empty path', () => {
      const result = getBreadcrumbHierarchy('', mockTranslations);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
    });
  });

  describe('Missing translations', () => {
    it('uses fallback values when translations are missing', () => {
      const emptyTranslations = {};
      const result = getBreadcrumbHierarchy('/for-authors', emptyTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });

    it('uses fallback for home when translation is missing', () => {
      const partialTranslations = {
        'components.header.publish': 'Publish',
      };
      const result = getBreadcrumbHierarchy('/for-authors', partialTranslations);

      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
    });

    it('uses fallback for category when translation is missing', () => {
      const partialTranslations = {
        'pages.home.title': 'Accueil',
      };
      const result = getBreadcrumbHierarchy('/for-authors', partialTranslations);

      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });
  });

  describe('Path variations', () => {
    it('handles paths with leading slash', () => {
      const result = getBreadcrumbHierarchy('/for-authors', mockTranslations);

      expect(result).toHaveLength(2);
      expect(result[1]).toEqual({ path: '#', label: 'Publish >' });
    });

    it('handles paths without leading slash', () => {
      // This should still work if the menu config has paths with leading slashes
      const result = getBreadcrumbHierarchy('for-authors', mockTranslations);

      // Should return only Home since path doesn't match
      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ path: '/', label: 'Home >' });
    });
  });

  describe('Category dropdown path handling', () => {
    it('sets category path to # for dropdown items', () => {
      const result = getBreadcrumbHierarchy('/for-authors', mockTranslations);

      // Category breadcrumb should have path="#" since dropdowns don't have pages
      expect(result[1].path).toBe('#');
    });

    it('always includes Home as first breadcrumb', () => {
      const testPaths = ['/for-authors', '/articles', '/about', '/unknown', '/boards'];

      testPaths.forEach(path => {
        const result = getBreadcrumbHierarchy(path, mockTranslations);
        expect(result[0]).toEqual({ path: '/', label: 'Home >' });
      });
    });
  });

  describe('French translations', () => {
    it('generates correct breadcrumb with French translations', () => {
      const frenchTranslations = {
        'pages.home.title': 'Accueil',
        'components.header.publish': 'Publier',
      };

      const result = getBreadcrumbHierarchy('/for-authors', frenchTranslations);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ path: '/', label: 'Accueil >' });
      expect(result[1]).toEqual({ path: '#', label: 'Publier >' });
    });
  });
});
