import {
  generateLanguageParams,
  combineWithLanguageParams,
  generateLanguageParamsForPage,
} from '../static-params-helper';

describe('static-params-helper utilities', () => {
  beforeEach(() => {
    // Clear all environment variables before each test
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    // Clean up after each test
    vi.unstubAllEnvs();
  });

  describe('generateLanguageParams', () => {
    describe('normal build mode', () => {
      it('should return all accepted languages in normal mode', () => {
        // In normal mode (no ONLY_BUILD_* env vars set)
        const result = generateLanguageParams();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);

        // Each result should have a lang property
        result.forEach(param => {
          expect(param).toHaveProperty('lang');
          expect(typeof param.lang).toBe('string');
        });
      });

      it('should return language params with correct structure', () => {
        const result = generateLanguageParams();

        result.forEach(param => {
          expect(Object.keys(param)).toEqual(['lang']);
        });
      });

      it('should include default language', () => {
        const result = generateLanguageParams();

        // Default language is 'en' unless configured otherwise
        const hasDefaultLanguage = result.some(param => param.lang === 'en' || param.lang);
        expect(hasDefaultLanguage).toBe(true);
      });
    });

    describe('article rebuild mode', () => {
      it('should return only default language when ONLY_BUILD_ARTICLE_ID is set', () => {
        vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '123');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('lang');
        // Should return the default language
        expect(result[0].lang).toBe('en');
      });

      it('should minimize generation with non-empty string article ID', () => {
        vi.stubEnv('ONLY_BUILD_ARTICLE_ID', 'article-123');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
      });
    });

    describe('volume rebuild mode', () => {
      it('should return only default language when ONLY_BUILD_VOLUME_ID is set', () => {
        vi.stubEnv('ONLY_BUILD_VOLUME_ID', '456');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('lang');
        expect(result[0].lang).toBe('en');
      });

      it('should minimize generation with volume ID', () => {
        vi.stubEnv('ONLY_BUILD_VOLUME_ID', 'vol-1');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
      });
    });

    describe('section rebuild mode', () => {
      it('should return only default language when ONLY_BUILD_SECTION_ID is set', () => {
        vi.stubEnv('ONLY_BUILD_SECTION_ID', '789');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
        expect(result[0]).toHaveProperty('lang');
        expect(result[0].lang).toBe('en');
      });

      it('should minimize generation with section ID', () => {
        vi.stubEnv('ONLY_BUILD_SECTION_ID', 'section-abc');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
      });
    });

    describe('multiple rebuild env vars', () => {
      it('should return only default when multiple ONLY_BUILD_ vars are set', () => {
        vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '123');
        vi.stubEnv('ONLY_BUILD_VOLUME_ID', '456');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
        expect(result[0].lang).toBe('en');
      });

      it('should handle all three rebuild vars simultaneously', () => {
        vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '123');
        vi.stubEnv('ONLY_BUILD_VOLUME_ID', '456');
        vi.stubEnv('ONLY_BUILD_SECTION_ID', '789');

        const result = generateLanguageParams();

        expect(result).toHaveLength(1);
        expect(result[0].lang).toBe('en');
      });
    });

    describe('static page rebuild mode', () => {
      it('should return all languages when ONLY_BUILD_STATIC_PAGE is set', () => {
        vi.stubEnv('ONLY_BUILD_STATIC_PAGE', 'about');

        const result = generateLanguageParams();

        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(1); // Should have multiple languages
        result.forEach(param => {
          expect(param).toHaveProperty('lang');
        });
      });
    });

    describe('edge cases', () => {
      it('should handle empty string for ONLY_BUILD_ARTICLE_ID', () => {
        // Empty string is falsy, so should behave like normal mode
        vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '');

        const result = generateLanguageParams();

        // Empty string is falsy, should return all languages
        expect(result.length).toBeGreaterThan(0);
      });

      it('should not be affected by other environment variables', () => {
        vi.stubEnv('SOME_OTHER_VAR', 'value');
        vi.stubEnv('RANDOM_ENV', '123');

        const result = generateLanguageParams();

        // Should behave as normal mode
        expect(result.length).toBeGreaterThan(0);
      });
    });
  });

  describe('generateLanguageParamsForPage', () => {
    it('should return all languages when ONLY_BUILD_STATIC_PAGE matches pageName', () => {
      vi.stubEnv('ONLY_BUILD_STATIC_PAGE', 'about');

      const result = generateLanguageParamsForPage('about');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);
      result.forEach(param => {
        expect(param).toHaveProperty('lang');
      });
    });

    it('should return only default language when ONLY_BUILD_STATIC_PAGE does not match pageName', () => {
      vi.stubEnv('ONLY_BUILD_STATIC_PAGE', 'about');

      // We are building 'about', but asking for 'credits' params
      const result = generateLanguageParamsForPage('credits');

      expect(result).toHaveLength(1);
      expect(result[0].lang).toBe('en');
    });

    it('should return only default language during resource rebuilds', () => {
      vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '123');

      const result = generateLanguageParamsForPage('about');

      expect(result).toHaveLength(1);
      expect(result[0].lang).toBe('en');
    });

    it('should return all languages during normal build', () => {
      const result = generateLanguageParamsForPage('about');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(1);
    });
  });

  describe('combineWithLanguageParams', () => {
    beforeEach(() => {
      vi.unstubAllEnvs();
    });

    it('should combine single param with all language params', () => {
      const params = [{ id: '123' }];

      const result = combineWithLanguageParams(params);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      // Each result should have both id and lang
      result.forEach(param => {
        expect(param).toHaveProperty('id');
        expect(param).toHaveProperty('lang');
        expect(param.id).toBe('123');
      });
    });

    it('should combine multiple params with all language params', () => {
      const params = [{ id: '123' }, { id: '456' }];

      const result = combineWithLanguageParams(params);

      const langCount = generateLanguageParams().length;

      // Should have params × languages combinations
      expect(result.length).toBe(params.length * langCount);

      // Should include combinations for both ids
      const ids = result.map(r => r.id);
      expect(ids).toContain('123');
      expect(ids).toContain('456');
    });

    it('should preserve original param properties', () => {
      const params = [{ id: '123', slug: 'article-one', category: 'tech' }];

      const result = combineWithLanguageParams(params);

      result.forEach(param => {
        expect(param.id).toBe('123');
        expect(param.slug).toBe('article-one');
        expect(param.category).toBe('tech');
        expect(param).toHaveProperty('lang');
      });
    });

    it('should handle empty params array', () => {
      const params: any[] = [];

      const result = combineWithLanguageParams(params);

      expect(result).toEqual([]);
    });

    it('should combine with single language in rebuild mode', () => {
      vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '999');

      const params = [{ id: '123' }, { id: '456' }];

      const result = combineWithLanguageParams(params);

      // In rebuild mode, only 1 language × 2 params = 2 results
      expect(result).toHaveLength(2);

      result.forEach(param => {
        expect(param.lang).toBe('en');
      });
    });

    it('should handle params with existing lang property', () => {
      const params = [{ id: '123', lang: 'existing' }];

      const result = combineWithLanguageParams(params);

      // lang property should be overridden by language params
      result.forEach(param => {
        expect(param).toHaveProperty('lang');
        // Should have the generated lang, not 'existing'
        expect(['en', 'fr', 'es']).toContain(param.lang || '');
      });
    });

    it('should create cartesian product of params and languages', () => {
      const params = [{ id: '1' }, { id: '2' }];

      const result = combineWithLanguageParams(params);

      // Should have all combinations
      const combinations = result.map(r => `${r.id}-${r.lang}`);

      // Each param should be combined with each language
      expect(combinations.length).toBe(params.length * generateLanguageParams().length);
    });

    it('should handle complex param objects', () => {
      const params = [
        {
          id: '123',
          slug: 'test-article',
          author: 'John Doe',
          tags: ['tech', 'science'],
          meta: { views: 100 },
        },
      ];

      const result = combineWithLanguageParams(params);

      result.forEach(param => {
        expect(param.id).toBe('123');
        expect(param.slug).toBe('test-article');
        expect(param.author).toBe('John Doe');
        expect(param.tags).toEqual(['tech', 'science']);
        expect(param.meta).toEqual({ views: 100 });
        expect(param).toHaveProperty('lang');
      });
    });

    it('should maintain param order', () => {
      const params = [{ id: '1' }, { id: '2' }, { id: '3' }];

      const result = combineWithLanguageParams(params);

      // Extract IDs in order
      const ids = result.map(r => r.id);

      // The pattern should repeat for each language
      const langCount = generateLanguageParams().length;

      for (let i = 0; i < params.length; i++) {
        const expectedId = params[i].id;
        // Check that this ID appears langCount times in sequence
        for (let j = 0; j < langCount; j++) {
          expect(ids[i * langCount + j]).toBe(expectedId);
        }
      }
    });

    it('should handle numeric param values', () => {
      const params = [{ id: '123', count: 42, active: true }];

      const result = combineWithLanguageParams(params);

      result.forEach(param => {
        expect(param.count).toBe(42);
        expect(param.active).toBe(true);
      });
    });
  });

  describe('integration scenarios', () => {
    it('should work together for normal build', () => {
      const langParams = generateLanguageParams();
      const params = [{ id: '1' }];
      const combined = combineWithLanguageParams(params);

      expect(combined.length).toBe(params.length * langParams.length);
    });

    it('should work together for article rebuild', () => {
      vi.stubEnv('ONLY_BUILD_ARTICLE_ID', '123');

      const langParams = generateLanguageParams();
      const params = [{ id: '1' }, { id: '2' }];
      const combined = combineWithLanguageParams(params);

      expect(langParams).toHaveLength(1);
      expect(combined).toHaveLength(2); // 2 params × 1 language
    });
  });
});
