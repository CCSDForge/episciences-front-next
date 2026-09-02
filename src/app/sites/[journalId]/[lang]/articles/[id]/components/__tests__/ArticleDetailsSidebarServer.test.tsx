import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ArticleDetailsSidebarServer from '../ArticleDetailsSidebarServer';
import { IArticle } from '@/types/article';
import { VOLUME_TYPE } from '@/utils/volume';
import { IVolume } from '@/types/volume';

// vi.mock factories are hoisted, so each stub has to be inlined.
vi.mock('../CiteDropdown', () => ({
  default: ({ label }: { label: string }) => <div data-testid="cite-dropdown">{label}</div>,
}));
vi.mock('../MetadataDropdown', () => ({
  default: ({ label }: { label: string }) => <div data-testid="metadata-dropdown">{label}</div>,
}));
vi.mock('../ShareDropdown', () => ({
  default: ({ label }: { label: string }) => <div data-testid="share-dropdown">{label}</div>,
}));

const translations = {
  common: {
    doi: 'DOI',
    volumeCard: { volume: 'Volume', proceeding: 'Proceeding', specialIssue: 'Special issue' },
  },
  pages: {
    articleDetails: {
      license: 'License',
      publicationDetails: {
        title: 'Publication details',
        submittedOn: 'Submitted on',
        importedOn: 'Imported on',
        acceptedOn: 'Accepted on',
        publishedOn: 'Published on',
        lastModifiedOn: 'Last modified on',
      },
      actions: {
        download: 'Download',
        openOn: 'Open on',
        cite: 'Cite',
        metadata: 'Metadata',
        share: { text: 'Share' },
      },
      download: { openPDF: 'Open PDF' },
      funding: 'Funding',
      metrics: { title: 'Metrics', views: 'views', downloads: 'downloads' },
    },
  },
} as never;

const baseArticle: IArticle = {
  id: 42,
  title: 'Sample Article',
  authors: [],
  publicationDate: '2024-01-01',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-1',
  doi: '10.1234/abc',
};

describe('ArticleDetailsSidebarServer', () => {
  it('renders the cite/metadata/share dropdowns', () => {
    render(
      <ArticleDetailsSidebarServer
        article={baseArticle}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText('Cite')).toBeInTheDocument();
    expect(screen.getByText('Metadata')).toBeInTheDocument();
    expect(screen.getByText('Share')).toBeInTheDocument();
  });

  it('renders the download link when pdfLink is present', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, pdfLink: 'https://example.com/a.pdf' }}
        translations={translations}
        language="en"
      />
    );

    const link = screen.getByText('Download').closest('a');
    expect(link).toHaveAttribute('href', '/en/articles/42/download');
  });

  it('renders the "open on repository" link when docLink is present', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, docLink: 'https://hal.science/hal-1' }}
        translations={translations}
        language="en"
      />
    );

    const link = screen.getByText(/HAL/).closest('a');
    expect(link).toHaveAttribute('href', 'https://hal.science/hal-1');
  });

  it('renders the DOI link', () => {
    render(
      <ArticleDetailsSidebarServer
        article={baseArticle}
        translations={translations}
        language="en"
      />
    );

    const link = screen.getByText('10.1234/abc').closest('a');
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1234/abc');
  });

  it('omits the DOI section when doi is blank', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, doi: '   ' }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.queryByText('DOI')).not.toBeInTheDocument();
  });

  it('renders the related volume link with a localized path', () => {
    const relatedVolume: IVolume = {
      id: 5,
      num: 3,
      types: [],
      title: { en: 'Volume title' },
    } as never;
    render(
      <ArticleDetailsSidebarServer
        article={baseArticle}
        relatedVolume={relatedVolume}
        translations={translations}
        language="fr"
      />
    );

    const link = screen.getByText(/Volume 3/).closest('a');
    expect(link).toHaveAttribute('href', '/fr/volumes/5');
    expect(screen.getByText('Volume title')).toBeInTheDocument();
  });

  it('renders "Proceeding" text for a proceedings volume', () => {
    const relatedVolume: IVolume = {
      id: 5,
      num: 3,
      types: [VOLUME_TYPE.PROCEEDINGS],
    } as never;
    render(
      <ArticleDetailsSidebarServer
        article={baseArticle}
        relatedVolume={relatedVolume}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText(/Proceeding 3/)).toBeInTheDocument();
  });

  it('renders the related section link when article.section is present with a title', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, section: { id: 9, title: { en: 'Physics' } } as never }}
        translations={translations}
        language="en"
      />
    );

    const link = screen.getByText('Physics').closest('a');
    expect(link).toHaveAttribute('href', '/en/sections/9');
  });

  it('renders publication date rows for present dates', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{
          ...baseArticle,
          submissionDate: '2023-10-01',
          acceptanceDate: '2023-11-01',
          modificationDate: '2024-01-15',
        }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText('Submitted on')).toBeInTheDocument();
    expect(screen.getByText('Accepted on')).toBeInTheDocument();
    expect(screen.getByText('Published on')).toBeInTheDocument();
    expect(screen.getByText('Last modified on')).toBeInTheDocument();
  });

  it('shows "Imported on" instead of "Submitted on" and hides "Accepted on" for imported articles', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{
          ...baseArticle,
          submissionDate: '2023-10-01',
          acceptanceDate: '2023-11-01',
          isImported: true,
        }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText('Imported on')).toBeInTheDocument();
    expect(screen.queryByText('Submitted on')).not.toBeInTheDocument();
    expect(screen.queryByText('Accepted on')).not.toBeInTheDocument();
  });

  it('renders funding entries with award numbers', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, fundings: [{ funder: 'ANR', award: 'ANR-21-001' } as never] }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText('ANR')).toBeInTheDocument();
    expect(screen.getByText('#ANR-21-001')).toBeInTheDocument();
  });

  it('omits funding when the article has none', () => {
    render(
      <ArticleDetailsSidebarServer
        article={baseArticle}
        translations={translations}
        language="en"
      />
    );

    expect(screen.queryByText('Funding')).not.toBeInTheDocument();
  });

  it('renders metrics when views or downloads are non-zero', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, metrics: { views: 10, downloads: 0 } }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.getByText('Metrics')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });

  it('omits metrics when both views and downloads are zero', () => {
    render(
      <ArticleDetailsSidebarServer
        article={{ ...baseArticle, metrics: { views: 0, downloads: 0 } }}
        translations={translations}
        language="en"
      />
    );

    expect(screen.queryByText('Metrics')).not.toBeInTheDocument();
  });
});
