import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('node:fs', () => ({
  default: {
    existsSync: vi.fn(),
    readFileSync: vi.fn(),
  },
  existsSync: vi.fn(),
  readFileSync: vi.fn(),
}));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: vi.fn((key: string) => key),
}));

vi.mock('@/utils/journal-filter', () => ({
  getFilteredJournals: vi.fn(() => ['epijinfo', 'jsat']),
}));

vi.mock('@/utils/language-utils', () => ({
  acceptedLanguages: ['en', 'fr'],
  defaultLanguage: 'en',
}));

vi.mock('@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar', () => ({
  default: (props: any) => (
    <div data-testid="markdown-page-with-sidebar">{JSON.stringify(props)}</div>
  ),
}));

import fs from 'node:fs';

function makeProps(journalId = 'epijinfo', lang = 'en') {
  return { params: Promise.resolve({ journalId, lang }) };
}

describe('AccessibilityPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateStaticParams', () => {
    it('builds params for every journal x language combination', async () => {
      const { generateStaticParams } = await import('../page');
      const params = await generateStaticParams();

      expect(params).toEqual([
        { journalId: 'epijinfo', lang: 'en' },
        { journalId: 'epijinfo', lang: 'fr' },
        { journalId: 'jsat', lang: 'en' },
        { journalId: 'jsat', lang: 'fr' },
      ]);
    });
  });

  describe('generateMetadata', () => {
    it('returns translated title/description and seo alternates', async () => {
      const { generateMetadata } = await import('../page');
      const metadata = await generateMetadata(makeProps('epijinfo', 'fr'));

      expect(metadata.title).toBe('pages.accessibility.title');
      expect(metadata.description).toBe('pages.accessibility.description');
      expect(metadata.alternates).toBeDefined();
    });
  });

  describe('default export', () => {
    it('reads the markdown content file matching the requested language', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('# Accessibility statement (fr)');

      const { default: AccessibilityPage } = await import('../page');
      const jsx = await AccessibilityPage(makeProps('epijinfo', 'fr'));

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${require('path').sep}fr.md`),
        'utf8'
      );
      expect(JSON.stringify(jsx)).toContain('Accessibility statement (fr)');
    });

    it('falls back to the default language file when the requested language file is missing', async () => {
      vi.mocked(fs.existsSync).mockImplementation((p: unknown) => String(p).endsWith('en.md'));
      vi.mocked(fs.readFileSync).mockReturnValue('# Accessibility statement (en)');

      const { default: AccessibilityPage } = await import('../page');
      const jsx = await AccessibilityPage(makeProps('epijinfo', 'es'));

      expect(fs.readFileSync).toHaveBeenCalledWith(
        expect.stringContaining(`${require('path').sep}en.md`),
        'utf8'
      );
      expect(JSON.stringify(jsx)).toContain('Accessibility statement (en)');
    });

    it('uses the noContent translation when no candidate file exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const { default: AccessibilityPage } = await import('../page');
      const jsx = await AccessibilityPage(makeProps());

      expect(fs.readFileSync).not.toHaveBeenCalled();
      expect(JSON.stringify(jsx)).toContain('pages.accessibility.noContent');
    });

    it('renders a generic error message when reading the content file throws', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw new Error('EACCES');
      });

      const { default: AccessibilityPage } = await import('../page');
      const jsx = await AccessibilityPage(makeProps());

      expect(JSON.stringify(jsx)).toContain('Error loading content.');
    });
  });
});
