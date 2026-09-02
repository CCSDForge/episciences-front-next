import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LinkedPublicationsSectionServer from '../LinkedPublicationsSectionServer';
import { INTER_WORK_RELATIONSHIP, LINKED_PUBLICATION_IDENTIFIER_TYPE } from '@/utils/article';
import { Translations } from '@/utils/server-i18n';
import { RepositoryPreview } from '@/types/repository-preview';

const translations: Translations = {
  pages: {
    articleDetails: {
      relationships: {
        hasDerivation: 'Has derivation',
      },
      repositoryPreview: {
        preview: 'Preview',
        hidePreview: 'Hide preview',
        viewerTitle: '{{provider}} viewer',
        imageBadge: 'Image',
        loading: 'Loading…',
        error: 'Failed to load',
        retry: 'Retry',
        selectFile: 'Select a file',
        openOnRepository: 'Open on {{provider}}',
      },
    },
  },
} as unknown as Translations;

const nakalaPreview: RepositoryPreview = {
  providerId: 'nakala',
  identifier: '10.34847/nkl.067bpg32',
  landingUrl: 'https://nakala.fr/10.34847/nkl.067bpg32',
  files: [
    {
      id: 'sha1',
      label: 'Annexe.jpg',
      embedUrl: 'https://api.nakala.fr/embed/10.34847/nkl.067bpg32/sha1?buttons=true',
      kind: 'image',
    },
  ],
};

describe('LinkedPublicationsSectionServer', () => {
  it('returns null when relatedItems is empty', () => {
    const { container } = render(
      <LinkedPublicationsSectionServer relatedItems={[]} translations={translations} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when all items are filtered out (isSameAs / hasPreprint)', () => {
    const { container } = render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'a',
            identifierType: 'uri',
            relationshipType: INTER_WORK_RELATIONSHIP.IS_SAME_AS,
          },
          {
            value: 'b',
            identifierType: 'uri',
            relationshipType: INTER_WORK_RELATIONSHIP.HAS_PREPRINT,
          },
        ]}
        translations={translations}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a citation as markdown with a relationship badge', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'x',
            identifierType: 'other',
            relationshipType: INTER_WORK_RELATIONSHIP.HAS_DERIVATION,
            citation: 'Some **citation** text',
          },
        ]}
        translations={translations}
      />
    );

    expect(screen.getByText('Has derivation')).toBeInTheDocument();
    expect(screen.getByText('citation')).toBeInTheDocument();
  });

  it('renders a URI identifier as a link', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'https://example.com/paper',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.URI,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    const link = screen.getByRole('link', { name: 'https://example.com/paper' });
    expect(link).toHaveAttribute('href', 'https://example.com/paper');
  });

  it('renders a DOI identifier resolved through the DOI homepage', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: '10.1234/xyz',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.DOI,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    const link = screen.getByRole('link', { name: '10.1234/xyz' });
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1234/xyz');
  });

  it('renders an arXiv identifier resolved through the arXiv homepage', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: '2301.00001',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.ARXIV,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    const link = screen.getByRole('link', { name: '2301.00001' });
    expect(link).toHaveAttribute('href', 'https://arxiv.org/abs/2301.00001');
  });

  it('renders a HAL identifier resolved through the HAL homepage', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'hal-01234',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.HAL,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    const link = screen.getByRole('link', { name: 'hal-01234' });
    expect(link).toHaveAttribute('href', 'https://hal.science/hal-01234');
  });

  it('renders a Software Heritage badge and embed for "other" swh identifiers', () => {
    const { container } = render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'swh:1:dir:abcdef',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    expect(
      container.querySelector(
        '.articleDetails-content-article-section-content-linkedPublications-publication-img'
      )
    ).toHaveAttribute('src', 'https://archive.softwareheritage.org/badge/swh:1:dir:abcdef');
    expect(container.querySelector('iframe')).toHaveAttribute(
      'src',
      'https://archive.softwareheritage.org/browse/embed/swh:1:dir:abcdef'
    );
  });

  it('renders a generic https "other" identifier as a link', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'https://plain-url.example/resource',
            identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER,
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    expect(
      screen.getByRole('link', { name: 'https://plain-url.example/resource' })
    ).toBeInTheDocument();
  });

  it('falls back to plain text for an unrecognized identifier type', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'raw-value',
            identifierType: 'something-else',
            relationshipType: 'unknown-relationship',
          },
        ]}
        translations={translations}
      />
    );

    expect(screen.getByText('raw-value')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits the relationship badge when no matching relationship label exists', () => {
    const { container } = render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'raw-value',
            identifierType: 'something-else',
            relationshipType: 'totally-unknown',
          },
        ]}
        translations={translations}
      />
    );

    expect(
      container.querySelector(
        '.articleDetails-content-article-section-content-linkedPublications-publication-badge'
      )
    ).not.toBeInTheDocument();
  });

  it('renders a repository preview item (with its toggle) even when the item also has a citation', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: '10.34847/nkl.067bpg32',
            identifierType: 'doi',
            relationshipType: INTER_WORK_RELATIONSHIP.HAS_DERIVATION,
            citation: 'Delvigne, V. et al. (2024). Microphotographies.',
          },
        ]}
        translations={translations}
        repositoryPreviews={{ 'doi-10.34847/nkl.067bpg32': nakalaPreview }}
      />
    );

    // The repository branch renders the citation AND a preview toggle button — the plain
    // citation-only branch (checked afterwards) would render no such button.
    expect(screen.getByRole('button', { name: /Preview/ })).toBeInTheDocument();
    expect(screen.getByText(/Delvigne, V\. et al\./)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '10.34847/nkl.067bpg32' })).toHaveAttribute(
      'href',
      'https://nakala.fr/10.34847/nkl.067bpg32'
    );
  });

  it('renders the plain citation branch (no toggle) for an item with no repository preview', () => {
    render(
      <LinkedPublicationsSectionServer
        relatedItems={[
          {
            value: 'unrelated-value',
            identifierType: 'doi',
            relationshipType: INTER_WORK_RELATIONSHIP.HAS_DERIVATION,
            citation: 'A plain citation.',
          },
        ]}
        translations={translations}
        repositoryPreviews={{ 'doi-10.34847/nkl.067bpg32': nakalaPreview }}
      />
    );

    expect(screen.queryByRole('button', { name: /Preview/ })).not.toBeInTheDocument();
    expect(screen.getByText('A plain citation.')).toBeInTheDocument();
  });
});
