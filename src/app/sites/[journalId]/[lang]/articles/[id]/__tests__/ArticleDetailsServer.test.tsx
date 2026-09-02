import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { vi } from 'vitest';
import ArticleDetailsServer from '../ArticleDetailsServer';
import { IArticle } from '@/types/article';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/articles/1'),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: any) => <img src={src} alt={alt} {...props} />,
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('../components/ArticleDetailsSidebarServer', () => ({
  default: () => <div data-testid="article-details-sidebar-server" />,
}));

vi.mock('../components/CollapsibleInstitutions', () => ({
  default: ({ authors }: { authors: unknown[] }) => (
    <div data-testid="collapsible-institutions">{authors.length} authors</div>
  ),
}));

vi.mock('../components/AbstractSection', () => ({
  default: () => <div data-testid="abstract-section" />,
}));

vi.mock('../components/KeywordsSection', () => ({
  default: () => <div data-testid="keywords-section" />,
}));

vi.mock('../components/ClassificationsSection', () => ({
  default: () => <div data-testid="classifications-section" />,
}));

vi.mock('../components/LinkedPublicationsSectionServer', () => ({
  default: () => <div data-testid="linked-publications-section" />,
}));

vi.mock('../components/CitedBySection', () => ({
  default: () => <div data-testid="cited-by-section" />,
}));

vi.mock('../components/ReferencesSection', () => ({
  default: () => <div data-testid="references-section" />,
}));

vi.mock('../components/PreviewSection', () => ({
  default: () => <div data-testid="preview-section" />,
}));

const translations = {
  pages: {
    home: { title: 'Home' },
    articles: { title: 'Articles' },
    articleDetails: {
      sections: {
        graphicalAbstract: 'Graphical abstract',
        abstract: 'Abstract',
        keywords: 'Keywords',
        mscClassifications: 'MSC',
        linkedPublications: 'Linked publications',
        citedBy: 'Cited by',
        preview: 'Preview',
        references: 'References',
      },
    },
    common: { content: 'Content' },
  },
  common: { content: 'Content' },
} as never;

const baseArticle: IArticle = {
  id: 1,
  title: 'Sample Article',
  authors: [{ fullname: 'Jane Doe', institutions: [{ name: 'MIT' } as never] }],
  publicationDate: '2024-01-01',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-1',
  doi: '10.1234/abc',
};

describe('ArticleDetailsServer', () => {
  it('renders the article title and sidebar', () => {
    render(
      <ArticleDetailsServer
        article={baseArticle}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(screen.getAllByText('Sample Article').length).toBeGreaterThan(0);
    expect(screen.getByTestId('article-details-sidebar-server')).toBeInTheDocument();
  });

  it('groups authors and institutions via CollapsibleInstitutions', () => {
    render(
      <ArticleDetailsServer
        article={baseArticle}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(screen.getAllByTestId('collapsible-institutions')[0]).toHaveTextContent('1 authors');
  });

  it('renders "No authors" branch absent when authors is empty', () => {
    render(
      <ArticleDetailsServer
        article={{ ...baseArticle, authors: [] }}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(screen.queryByTestId('collapsible-institutions')).not.toBeInTheDocument();
  });

  it('renders the article type tag using a matching articleTypes label', () => {
    render(
      <ArticleDetailsServer
        article={{ ...baseArticle, tag: 'article' }}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(document.querySelector('.articleDetails-tag')).toBeInTheDocument();
  });

  it('renders the graphical abstract image when rvcode and graphicalAbstract are present', () => {
    render(
      <ArticleDetailsServer
        article={{ ...baseArticle, graphicalAbstract: 'fig1.png' }}
        id="1"
        journalId="epijinfo"
        translations={translations}
        language="en"
      />
    );

    const img = document.querySelector(
      '.articleDetails-content-article-section-content-graphicalAbstract'
    );
    expect(img).toHaveAttribute(
      'src',
      'https://epijinfo.episciences.org/public/documents/1/fig1.png'
    );
  });

  it('renders the abstract section only when article.abstract is present', () => {
    const { rerender } = render(
      <ArticleDetailsServer
        article={baseArticle}
        id="1"
        translations={translations}
        language="en"
      />
    );
    expect(screen.queryByTestId('abstract-section')).not.toBeInTheDocument();

    rerender(
      <ArticleDetailsServer
        article={{ ...baseArticle, abstract: 'An abstract' }}
        id="1"
        translations={translations}
        language="en"
      />
    );
    expect(screen.getByTestId('abstract-section')).toBeInTheDocument();
  });

  it('renders the preview section when the article has a pdfLink', () => {
    render(
      <ArticleDetailsServer
        article={{ ...baseArticle, pdfLink: 'https://example.com/a.pdf' }}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByTestId('preview-section')).toBeInTheDocument();
  });

  it('embeds a JSON-LD script tag describing the article', () => {
    const { container } = render(
      <ArticleDetailsServer
        article={baseArticle}
        id="1"
        translations={translations}
        language="en"
      />
    );

    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).toBeInTheDocument();
    expect(script?.innerHTML).toContain('ScholarlyArticle');
  });

  it('renders signposting <link> tags hoisted to the document head', () => {
    render(
      <ArticleDetailsServer
        article={baseArticle}
        id="1"
        translations={translations}
        language="en"
      />
    );

    expect(document.head.querySelector('link[rel="linkset"]')).toBeInTheDocument();
  });
});
