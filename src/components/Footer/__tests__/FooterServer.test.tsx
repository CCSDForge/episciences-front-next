import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import FooterServer from '../FooterServer';
import { getJournalByCode } from '@/services/journal';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ i18n: { language: 'en' } }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/services/journal', () => ({
  getJournalByCode: vi.fn(),
}));

vi.mock('@/utils/server-i18n', () => ({
  getServerTranslations: vi.fn().mockResolvedValue({}),
  t: (key: string) => key,
}));

describe('FooterServer', () => {
  afterEach(() => {
    vi.mocked(getJournalByCode).mockReset();
    delete process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  });

  it('renders the footer with the journal logo alt text falling back to rvcode', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue(undefined as never);

    render(await FooterServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getByAltText('epijinfo logo')).toBeInTheDocument();
  });

  it('renders the journal name and settings-derived notice/ISSN links', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({
      name: 'Epi Journal',
      logo: 'epijinfo.svg',
      settings: [
        { setting: 'contactJournalNotice', value: 'https://example.com/notice' },
        { setting: 'ISSN', value: '1234-5678' },
      ],
    } as never);

    render(await FooterServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getByAltText('Epi Journal logo')).toBeInTheDocument();
    expect(screen.getByText('components.footer.links.notice').closest('a')).toHaveAttribute(
      'href',
      'https://example.com/notice'
    );
    expect(screen.getByText('eISSN 1234-5678')).toBeInTheDocument();
  });

  it('omits the notice link and ISSN when settings do not provide them', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue({ name: 'Epi Journal', settings: [] } as never);

    render(await FooterServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.queryByText('components.footer.links.notice')).not.toBeInTheDocument();
    expect(screen.queryByText(/eISSN/)).not.toBeInTheDocument();
  });

  it('falls back gracefully when fetching the journal fails', async () => {
    vi.mocked(getJournalByCode).mockRejectedValue(new Error('network down'));

    render(await FooterServer({ lang: 'en', journalId: 'epijinfo' }));

    expect(screen.getByAltText('epijinfo logo')).toBeInTheDocument();
  });

  it('builds French URLs for documentation/partners/legal links when lang is fr', async () => {
    vi.mocked(getJournalByCode).mockResolvedValue(undefined as never);

    render(await FooterServer({ lang: 'fr', journalId: 'epijinfo' }));

    const partnersLink = screen.getByText(
      'components.footer.links.acknowledgements'
    ) as HTMLElement;
    expect(partnersLink.closest('a')).toHaveAttribute(
      'href',
      expect.stringContaining('/fr/partenaires')
    );
  });

  it('defaults the journal code to the env var when no journalId prop is given', async () => {
    process.env.NEXT_PUBLIC_JOURNAL_RVCODE = 'epijinfo';
    vi.mocked(getJournalByCode).mockResolvedValue(undefined as never);

    render(await FooterServer({ lang: 'en' }));

    expect(getJournalByCode).toHaveBeenCalledWith('epijinfo');
  });
});
