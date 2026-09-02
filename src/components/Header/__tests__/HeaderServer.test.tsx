import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import HeaderServer from '../HeaderServer';
import { getJournalByCode } from '@/services/journal';
import { fetchVolumes } from '@/services/volume';
import { getPublicJournalConfig } from '@/utils/env-loader';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/services/journal', () => ({ getJournalByCode: vi.fn() }));
vi.mock('@/services/volume', () => ({ fetchVolumes: vi.fn() }));
vi.mock('@/utils/env-loader', () => ({ getPublicJournalConfig: vi.fn(() => ({})) }));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: (key: string) => key,
}));

vi.mock('@/components/Header/LanguageDropdownWrapper', () => ({
  default: () => <div data-testid="language-dropdown" />,
}));

vi.mock('@/components/Header/MobileBurgerMenu', () => ({
  default: () => <div data-testid="mobile-burger-menu" />,
}));

vi.mock('@/components/Header/SearchBar', () => ({
  default: () => <div data-testid="search-bar" />,
}));

describe('HeaderServer', () => {
  afterEach(() => {
    vi.mocked(getJournalByCode).mockReset();
    vi.mocked(fetchVolumes).mockReset();
    vi.mocked(getPublicJournalConfig).mockReset().mockReturnValue({});
  });

  it('renders the journal name from the fetched journal', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal' } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getAllByText('Epi Journal').length).toBeGreaterThan(0);
  });

  it('falls back to the journal title in the requested language when name is absent', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({
      title: { en: 'Titled Journal' },
    } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getAllByText('Titled Journal').length).toBeGreaterThan(0);
  });

  it('falls back to "Journal" when the fetch fails', async () => {
    vi.mocked(getJournalByCode).mockRejectedValue(new Error('network down'));
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getAllByText('Journal').length).toBeGreaterThan(0);
  });

  it('renders the journal subtitle when present', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({
      name: 'Epi Journal',
      subtitle: 'A subtitle',
    } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getByText('A subtitle')).toBeInTheDocument();
  });

  it('renders markdown bold and italic in the journal subtitle', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({
      name: 'Epi Journal',
      subtitle: 'Science & *Motricité* with **Bold**',
    } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    const { container } = render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    const subtitle = container.querySelector('.header-journal-subtitle');
    expect(subtitle).toBeInTheDocument();
    expect(subtitle?.querySelector('em')?.textContent).toBe('Motricité');
    expect(subtitle?.querySelector('strong')?.textContent).toBe('Bold');
  });

  it('renders the sign-in link when a manager URL is configured', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal' } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);
    vi.mocked(getPublicJournalConfig).mockReturnValue({
      NEXT_PUBLIC_EPISCIENCES_MANAGER: 'https://manager.test',
    });

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    const signInLinks = screen
      .getAllByRole('link')
      .filter(link => link.getAttribute('href')?.includes('/user/login'));
    expect(signInLinks.length).toBeGreaterThan(0);
    expect(signInLinks[0]).toHaveAttribute('href', 'https://manager.test/epijinfo/user/login');
  });

  it('omits the sign-in link when no manager URL is configured', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal' } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    const signInLinks = screen
      .getAllByRole('link')
      .filter(link => link.getAttribute('href')?.includes('/user/login'));
    expect(signInLinks).toHaveLength(0);
  });

  it('renders the search bar and mobile burger menu', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal' } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getByTestId('search-bar')).toBeInTheDocument();
    expect(screen.getByTestId('mobile-burger-menu')).toBeInTheDocument();
    expect(screen.getAllByTestId('language-dropdown').length).toBeGreaterThan(0);
  });

  it('renders skip links for keyboard navigation', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal' } as never);
    vi.mocked(fetchVolumes).mockResolvedValue({ data: [] } as never);

    render(await HeaderServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(document.querySelectorAll('.skip-link').length).toBe(2);
  });
});
