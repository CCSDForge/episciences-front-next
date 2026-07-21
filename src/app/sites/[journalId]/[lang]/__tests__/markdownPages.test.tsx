import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import AcknowledgementsClient from '../acknowledgements/AcknowledgementsClient';
import ForEditorsClient from '../for-editors/ForEditorsClient';
import ForReviewersClient from '../for-reviewers/ForReviewersClient';
import ForConferenceOrganisersClient from '../for-conference-organisers/ForConferenceOrganisersClient';
import EthicalCharterClient from '../ethical-charter/EthicalCharterClient';
import IndexingClient from '../indexing/IndexingClient';
import ProposingSpecialIssuesClient from '../proposing-special-issues/ProposingSpecialIssuesClient';

import { fetchAcknowledgementsPage } from '@/services/acknowledgements';
import { fetchForEditorsPage } from '@/services/forEditors';
import { fetchForReviewersPage } from '@/services/forReviewers';
import { fetchForConferenceOrganisersPage } from '@/services/forConferenceOrganisers';
import { fetchEthicalCharterPage } from '@/services/forAuthors';
import { fetchIndexingPage } from '@/services/indexing';
import { fetchProposingSpecialIssuesPage } from '@/services/proposingSpecialIssues';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/page'),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'en' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/services/acknowledgements', () => ({ fetchAcknowledgementsPage: vi.fn() }));
vi.mock('@/services/forEditors', () => ({ fetchForEditorsPage: vi.fn() }));
vi.mock('@/services/forReviewers', () => ({ fetchForReviewersPage: vi.fn() }));
vi.mock('@/services/forConferenceOrganisers', () => ({
  fetchForConferenceOrganisersPage: vi.fn(),
}));
vi.mock('@/services/forAuthors', () => ({ fetchEthicalCharterPage: vi.fn() }));
vi.mock('@/services/indexing', () => ({ fetchIndexingPage: vi.fn() }));
vi.mock('@/services/proposingSpecialIssues', () => ({
  fetchProposingSpecialIssuesPage: vi.fn(),
}));

const pages = [
  {
    name: 'AcknowledgementsClient',
    Component: AcknowledgementsClient,
    fetchMock: vi.mocked(fetchAcknowledgementsPage),
    titleKey: 'pages.acknowledgements.title',
    noContentKey: 'pages.acknowledgements.noContent',
    directPage: false,
  },
  {
    name: 'ForEditorsClient',
    Component: ForEditorsClient,
    fetchMock: vi.mocked(fetchForEditorsPage),
    titleKey: 'pages.forEditors.title',
    noContentKey: 'pages.forEditors.noContent',
    directPage: false,
  },
  {
    name: 'ForReviewersClient',
    Component: ForReviewersClient,
    fetchMock: vi.mocked(fetchForReviewersPage),
    titleKey: 'pages.forReviewers.title',
    noContentKey: 'pages.forReviewers.noContent',
    directPage: false,
  },
  {
    name: 'ForConferenceOrganisersClient',
    Component: ForConferenceOrganisersClient,
    fetchMock: vi.mocked(fetchForConferenceOrganisersPage),
    titleKey: 'pages.forConferenceOrganisers.title',
    noContentKey: 'pages.forConferenceOrganisers.noContent',
    directPage: false,
  },
  {
    name: 'EthicalCharterClient',
    Component: EthicalCharterClient,
    fetchMock: vi.mocked(fetchEthicalCharterPage),
    titleKey: 'pages.ethicalCharter.title',
    noContentKey: 'pages.ethicalCharter.noContent',
    directPage: true,
  },
  {
    name: 'IndexingClient',
    Component: IndexingClient,
    fetchMock: vi.mocked(fetchIndexingPage),
    titleKey: 'pages.indexing.title',
    noContentKey: 'pages.indexing.noContent',
    directPage: true,
  },
  {
    name: 'ProposingSpecialIssuesClient',
    Component: ProposingSpecialIssuesClient,
    directPage: true,
    fetchMock: vi.mocked(fetchProposingSpecialIssuesPage),
    titleKey: 'pages.proposingSpecialIssues.title',
    noContentKey: 'pages.proposingSpecialIssues.noContent',
  },
] as const;

describe.each(pages)('$name (MarkdownPageWithSidebar pattern)', ({ Component, fetchMock, titleKey, noContentKey, directPage }) => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('renders the localized title and content from initialPage', () => {
    render(
      <Component
        initialPage={{
          title: { en: 'Custom Title', fr: 'Titre personnalisé' },
          content: { en: 'Custom content', fr: 'Contenu personnalisé' },
        }}
        lang="en"
      />
    );

    expect(screen.getByText('Custom Title')).toBeInTheDocument();
    expect(screen.getByText('Custom content')).toBeInTheDocument();
  });

  it('falls back to the translated title when initialPage has none', () => {
    render(<Component initialPage={null} lang="en" />);
    expect(screen.getAllByText(titleKey).length).toBeGreaterThan(0);
  });

  it('shows the no-content message when there is no content in any language', () => {
    render(<Component initialPage={{ title: { en: 'T' }, content: {} }} lang="en" />);
    expect(screen.getByText(noContentKey)).toBeInTheDocument();
  });

  it('shows a language-not-available notice when content only exists in the default language', () => {
    // getLocalizedContent only falls back from requestedLang to the app's defaultLanguage
    // ('en' unless NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE is set) — so the requested language
    // here must differ from that default for the fallback branch to trigger.
    render(
      <Component
        initialPage={{ title: { en: 'T' }, content: { en: 'English only content' } }}
        lang="fr"
      />
    );

    expect(screen.getByText('common.contentNotInLanguage')).toBeInTheDocument();
    expect(screen.getByText('English only content')).toBeInTheDocument();
  });

  it('fetches the page client-side and merges data once resolved', async () => {
    const page = { title: { en: 'Fetched Title' }, content: { en: 'Fetched content' } };
    fetchMock.mockResolvedValue((directPage ? page : { 'hydra:member': [page] }) as never);

    render(<Component initialPage={null} lang="en" />);

    expect(await screen.findByText('Fetched Title')).toBeInTheDocument();
    // Content sections are parsed in a separate effect that fires after the title
    // re-render commits, so wait for it independently rather than asserting in lockstep.
    expect(await screen.findByText('Fetched content')).toBeInTheDocument();
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <Component
        initialPage={{ title: { en: 'T' }, content: { en: 'C' } }}
        lang="en"
        breadcrumbLabels={{
          parents: [{ path: '/', label: 'Custom home >' }],
          current: 'Custom current',
        }}
      />
    );

    expect(screen.getAllByText('Custom current').length).toBeGreaterThan(0);
  });
});
