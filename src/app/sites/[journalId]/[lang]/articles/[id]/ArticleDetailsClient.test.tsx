import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticleDetailsClient from './ArticleDetailsClient';
import { fetchVolume } from '@/services/volume';
import { fetchArticleMetadata } from '@/services/article';
import { IArticle } from '@/types/article';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/articles/1'),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/services/volume', () => ({
  fetchVolume: vi.fn(),
}));

vi.mock('@/services/article', () => ({
  fetchArticleMetadata: vi.fn(),
}));

vi.mock('@/utils/article', async importOriginal => {
  const actual = await importOriginal<typeof import('@/utils/article')>();
  return {
    ...actual,
    getCitations: vi.fn(() => Promise.resolve([])),
  };
});

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('@/components/Sidebars/ArticleDetailsSidebar/ArticleDetailsSidebar', () => ({
  default: () => <div data-testid="article-details-sidebar" />,
}));

vi.mock('./components/CollapsibleInstitutions', () => ({
  default: ({ authors }: { authors: unknown[] }) => (
    <div data-testid="collapsible-institutions">{authors.length} authors</div>
  ),
}));

vi.mock('./components/AbstractSection', () => ({
  default: () => <div data-testid="abstract-section" />,
}));

vi.mock('./components/KeywordsSection', () => ({
  default: () => <div data-testid="keywords-section" />,
}));

vi.mock('./components/ClassificationsSection', () => ({
  default: () => <div data-testid="classifications-section" />,
}));

vi.mock('./components/LinkedPublicationsSection', () => ({
  default: () => <div data-testid="linked-publications-section" />,
}));

vi.mock('./components/CitedBySection', () => ({
  default: () => <div data-testid="cited-by-section" />,
}));

vi.mock('./components/ReferencesSection', () => ({
  default: () => <div data-testid="references-section" />,
}));

vi.mock('next/dynamic', () => ({
  default: () => () => <div data-testid="preview-section" />,
}));

const baseArticle: IArticle = {
  id: 1,
  title: 'Sample Article',
  authors: [{ fullname: 'Jane Doe', institutions: [{ name: 'MIT' } as never] }],
  publicationDate: '2024-01-01',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-1',
  doi: '10.1234/abc',
  abstract: 'An abstract',
};

describe('ArticleDetailsClient', () => {
  beforeEach(() => {
    vi.mocked(fetchVolume).mockResolvedValue(null as never);
    vi.mocked(fetchArticleMetadata).mockResolvedValue(null);
  });

  it('shows the loader while data has not yet been fetched client-side', () => {
    const { container } = render(
      <ArticleDetailsClient article={baseArticle} id="1" lang="fr" />
    );

    expect(container.querySelector('.loader')).toBeInTheDocument();
  });

  it('renders the article once client-side data resolves', async () => {
    render(
      <ArticleDetailsClient
        article={baseArticle}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    expect((await screen.findAllByText('Sample Article'))[0]).toBeInTheDocument();
    expect(screen.getByTestId('article-details-sidebar')).toBeInTheDocument();
    expect(screen.getByTestId('abstract-section')).toBeInTheDocument();
  });

  it('shows the article type tag when the article has a tag', async () => {
    render(
      <ArticleDetailsClient
        article={{ ...baseArticle, tag: 'article' }}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await screen.findAllByText('Sample Article');
    expect(document.querySelector('.articleDetails-tag')).toBeInTheDocument();
  });

  it('renders the graphical abstract image when rvcode and graphicalAbstract are present', async () => {
    render(
      <ArticleDetailsClient
        article={{ ...baseArticle, graphicalAbstract: 'fig1.png' }}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await screen.findAllByText('Sample Article');
    const img = document.querySelector(
      '.articleDetails-content-article-section-content-graphicalAbstract'
    );
    expect(img).toHaveAttribute(
      'src',
      'https://journal.episciences.org/public/documents/1/fig1.png'
    );
  });

  it('collapses and expands a section when its header is clicked', async () => {
    render(
      <ArticleDetailsClient
        article={baseArticle}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await screen.findAllByText('Sample Article');
    const abstractHeader = screen.getByTestId('abstract-section').closest(
      '.articleDetails-content-article-section'
    )!.querySelector('[role="button"]') as HTMLElement;

    expect(abstractHeader).toHaveAttribute('aria-expanded', 'true');
    fireEvent.click(abstractHeader);
    expect(abstractHeader).toHaveAttribute('aria-expanded', 'false');
  });

  it('does not render the keywords section when there are no keywords', async () => {
    render(
      <ArticleDetailsClient
        article={{ ...baseArticle, keywords: [] }}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await screen.findAllByText('Sample Article');
    expect(screen.queryByTestId('keywords-section')).not.toBeInTheDocument();
  });

  it('renders the preview section when the article has a pdfLink', async () => {
    render(
      <ArticleDetailsClient
        article={{ ...baseArticle, pdfLink: 'https://example.com/a.pdf' }}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await screen.findAllByText('Sample Article');
    expect(screen.getByTestId('preview-section')).toBeInTheDocument();
  });

  it('fetches the related volume and metadata client-side when not provided', async () => {
    vi.mocked(fetchVolume).mockResolvedValue({ id: 1 } as never);
    vi.mocked(fetchArticleMetadata).mockResolvedValue('{}');

    render(
      <ArticleDetailsClient article={{ ...baseArticle, volumeId: 7 }} id="1" lang="fr" />
    );

    await waitFor(() => expect(fetchVolume).toHaveBeenCalledWith('journal', 7, 'fr'));
    expect(fetchArticleMetadata).toHaveBeenCalled();
  });

  it('handles a null article gracefully', async () => {
    render(
      <ArticleDetailsClient
        article={null}
        id="1"
        initialRelatedVolume={null}
        initialMetadataCSL={null}
        initialMetadataBibTeX={null}
        lang="fr"
      />
    );

    await waitFor(() =>
      expect(screen.getByTestId('article-details-sidebar')).toBeInTheDocument()
    );
    expect(screen.getAllByText('No authors processed yet').length).toBeGreaterThan(0);
  });
});
