import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import LanguageLayout, { generateMetadata, generateStaticParams } from '../layout';
import { fetchVolumes } from '@/services/volume';
import { getJournalByCode } from '@/services/journal';
import { getServerTranslations } from '@/utils/server-i18n';
import { getJournalApiUrl, getPublicJournalConfig } from '@/utils/env-loader';
import { getFilteredJournals } from '@/utils/journal-filter';

vi.mock('@/services/volume', () => ({
  fetchVolumes: vi.fn(),
}));

vi.mock('@/services/journal', () => ({
  getJournalByCode: vi.fn(),
}));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn(),
}));

vi.mock('@/utils/env-loader', () => ({
  getJournalApiUrl: vi.fn(() => 'https://api.example.org'),
  getPublicJournalConfig: vi.fn(() => ({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#123456' })),
}));

vi.mock('@/utils/journal-filter', () => ({
  getFilteredJournals: vi.fn(() => ['journal-a', 'journal-b']),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

vi.mock('@/components/Header/HeaderServer', () => ({
  default: ({ lang, journalId }: { lang: string; journalId: string }) => (
    <div data-testid="header-server" data-lang={lang} data-journal={journalId} />
  ),
}));

vi.mock('@/components/Header/HeaderClientWrapper', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="header-client-wrapper">{children}</div>
  ),
}));

vi.mock('@/components/Footer/FooterServer', () => ({
  default: ({ lang, journalId }: { lang: string; journalId: string }) => (
    <div data-testid="footer-server" data-lang={lang} data-journal={journalId} />
  ),
}));

vi.mock('@/components/ToastContainerWrapper/ToastContainerWrapper', () => ({
  default: () => <div data-testid="toast-container" />,
}));

vi.mock('@/components/ClientProviders/ClientProviders', () => ({
  default: ({ children, ...props }: { children: React.ReactNode; [key: string]: any }) => (
    <div data-testid="client-providers" data-props={JSON.stringify(props)}>
      {children}
    </div>
  ),
}));

const validJournal = {
  code: 'journal',
  name: 'Journal Name',
  title: { en: 'Journal Title EN', fr: 'Journal Title FR' },
};

describe('generateMetadata', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uses the localized journal title for the given lang', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);

    const metadata = await generateMetadata({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
    });

    expect(metadata.title).toEqual({
      template: '%s | Journal Title FR',
      default: 'Journal Title FR',
    });
  });

  it('falls back to the journal name when no localized title exists for the lang', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({
      code: 'journal',
      name: 'Journal Name',
    } as never);

    const metadata = await generateMetadata({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
    });

    expect(metadata.title).toEqual({
      template: '%s | Journal Name',
      default: 'Journal Name',
    });
  });

  it('falls back to "Episciences" when the journal fetch fails', async () => {
    vi.mocked(getJournalByCode).mockRejectedValue(new Error('boom'));

    const metadata = await generateMetadata({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
    });

    expect(metadata.title).toEqual({
      template: '%s | Episciences',
      default: 'Episciences',
    });
  });
});

describe('generateStaticParams', () => {
  it('builds a params list crossing every filtered journal with every accepted language', async () => {
    const params = await generateStaticParams();

    expect(vi.mocked(getFilteredJournals)).toHaveBeenCalled();
    expect(params.length).toBeGreaterThan(0);
    expect(params.every(p => 'journalId' in p && 'lang' in p)).toBe(true);
    expect(params.some(p => p.journalId === 'journal-a')).toBe(true);
    expect(params.some(p => p.journalId === 'journal-b')).toBe(true);
  });
});

describe('LanguageLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getJournalApiUrl).mockReturnValue('https://api.example.org');
    vi.mocked(getPublicJournalConfig).mockReturnValue({
      NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#123456',
    });
  });

  it('renders header, footer, toast and children when all preloads succeed', async () => {
    vi.mocked(fetchVolumes).mockResolvedValue({
      data: [{ id: 1, num: '1' }],
    } as never);
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);
    vi.mocked(getServerTranslations).mockResolvedValue({ common: { hello: 'Hello' } } as never);

    const jsx = await LanguageLayout({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
      children: <div data-testid="page-content">Page</div>,
    });
    const { getByTestId } = render(jsx);

    expect(getByTestId('header-client-wrapper')).toBeInTheDocument();
    expect(getByTestId('header-server')).toHaveAttribute('data-lang', 'fr');
    expect(getByTestId('header-server')).toHaveAttribute('data-journal', 'journal');
    expect(getByTestId('footer-server')).toHaveAttribute('data-lang', 'fr');
    expect(getByTestId('toast-container')).toBeInTheDocument();
    expect(getByTestId('page-content')).toHaveTextContent('Page');
  });

  it('passes the preloaded volume, journal, language and translations to ClientProviders', async () => {
    const volume = { id: 7, num: '7' };
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [volume] } as never);
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);
    vi.mocked(getServerTranslations).mockResolvedValue({ common: { hello: 'Bonjour' } } as never);

    const jsx = await LanguageLayout({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
      children: <div>content</div>,
    });
    const { getByTestId } = render(jsx);

    const props = JSON.parse(getByTestId('client-providers').getAttribute('data-props')!);
    expect(props.initialVolume).toEqual(volume);
    expect(props.initialJournal).toEqual(validJournal);
    expect(props.initialLanguage).toBe('fr');
    expect(props.journalId).toBe('journal');
    expect(props.translations).toEqual({ common: { hello: 'Bonjour' } });
    expect(props.apiEndpoint).toBe('/api/proxy');
    expect(props.journalConfig).toEqual({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#123456' });
  });

  it('leaves initialVolume null when there are no volumes returned', async () => {
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);
    vi.mocked(getServerTranslations).mockResolvedValue({} as never);

    const jsx = await LanguageLayout({
      params: Promise.resolve({ journalId: 'journal', lang: 'en' }),
      children: <div>content</div>,
    });
    const { getByTestId } = render(jsx);

    const props = JSON.parse(getByTestId('client-providers').getAttribute('data-props')!);
    expect(props.initialVolume).toBeNull();
  });

  it('falls back to null/empty preload values and still renders children when preloading throws', async () => {
    vi.mocked(fetchVolumes).mockRejectedValue(new Error('network error'));
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);
    vi.mocked(getServerTranslations).mockResolvedValue({} as never);

    const jsx = await LanguageLayout({
      params: Promise.resolve({ journalId: 'journal', lang: 'en' }),
      children: <div data-testid="page-content">Page</div>,
    });
    const { getByTestId } = render(jsx);

    const props = JSON.parse(getByTestId('client-providers').getAttribute('data-props')!);
    expect(props.initialVolume).toBeNull();
    expect(props.initialJournal).toBeNull();
    expect(props.translations).toEqual({});
    expect(getByTestId('page-content')).toBeInTheDocument();
  });

  it('extracts the language from route params via getLanguageFromParams', async () => {
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);
    vi.mocked(getJournalByCode).mockResolvedValue(validJournal as never);
    vi.mocked(getServerTranslations).mockResolvedValue({} as never);

    const jsx = await LanguageLayout({
      params: Promise.resolve({ journalId: 'journal', lang: 'fr' }),
      children: <div>content</div>,
    });
    const { getByTestId } = render(jsx);

    expect(getByTestId('header-server')).toHaveAttribute('data-lang', 'fr');
  });
});
