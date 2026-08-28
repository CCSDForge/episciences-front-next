import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import LinkedPublicationsSection from '../LinkedPublicationsSection';
import { INTER_WORK_RELATIONSHIP, LINKED_PUBLICATION_IDENTIFIER_TYPE } from '@/utils/article';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) =>
      key === 'pages.articleDetails.relationships.hasDerivation' ? 'Has derivation' : key,
    i18n: { language: 'en' },
  }),
}));

describe('LinkedPublicationsSection', () => {
  it('returns null when relatedItems is null/undefined', () => {
    const { container: c1 } = render(<LinkedPublicationsSection relatedItems={null as never} />);
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <LinkedPublicationsSection relatedItems={undefined as never} />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('returns null when relatedItems is empty', () => {
    const { container } = render(<LinkedPublicationsSection relatedItems={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when all items are filtered out (isSameAs / hasPreprint)', () => {
    const { container } = render(
      <LinkedPublicationsSection
        relatedItems={
          [
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
          ] as never
        }
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a citation as markdown with a relationship badge', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'x',
              identifierType: 'other',
              relationshipType: INTER_WORK_RELATIONSHIP.HAS_DERIVATION,
              citation: 'Some **citation** text',
            },
          ] as never
        }
      />
    );

    expect(screen.getByText('Has derivation')).toBeInTheDocument();
    expect(screen.getByText('citation')).toBeInTheDocument();
  });

  it('renders a URI identifier as a link', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'https://example.com/paper',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.URI,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    const link = screen.getByRole('link', { name: 'https://example.com/paper' });
    expect(link).toHaveAttribute('href', 'https://example.com/paper');
  });

  it('renders a DOI identifier resolved through the DOI homepage', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: '10.1234/xyz',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.DOI,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    const link = screen.getByRole('link', { name: '10.1234/xyz' });
    expect(link).toHaveAttribute('href', 'https://doi.org/10.1234/xyz');
  });

  it('renders an arXiv identifier resolved through the arXiv homepage', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: '2301.00001',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.ARXIV,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    const link = screen.getByRole('link', { name: '2301.00001' });
    expect(link).toHaveAttribute('href', 'https://arxiv.org/abs/2301.00001');
  });

  it('renders a HAL identifier resolved through the HAL homepage', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'hal-01234',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.HAL,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    const link = screen.getByRole('link', { name: 'hal-01234' });
    expect(link).toHaveAttribute('href', 'https://hal.science/hal-01234');
  });

  it('renders a Software Heritage badge and embed for "other" swh identifiers', () => {
    const { container } = render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'swh:1:dir:abcdef',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
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
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'https://plain-url.example/resource',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.OTHER,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    expect(
      screen.getByRole('link', { name: 'https://plain-url.example/resource' })
    ).toBeInTheDocument();
  });

  it('falls back to plain text for an unrecognized identifier type', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'raw-value',
              identifierType: 'something-else',
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    expect(screen.getByText('raw-value')).toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });

  it('omits the relationship badge when no matching relationship label exists', () => {
    const { container } = render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: 'raw-value',
              identifierType: 'something-else',
              relationshipType: 'totally-unknown',
            },
          ] as never
        }
      />
    );

    expect(
      container.querySelector(
        '.articleDetails-content-article-section-content-linkedPublications-publication-badge'
      )
    ).not.toBeInTheDocument();
  });

  it('renders multiple linked publications as list items', () => {
    render(
      <LinkedPublicationsSection
        relatedItems={
          [
            {
              value: '10.1234/xyz',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.DOI,
              relationshipType: 'unknown-relationship',
            },
            {
              value: '2301.00001',
              identifierType: LINKED_PUBLICATION_IDENTIFIER_TYPE.ARXIV,
              relationshipType: 'unknown-relationship',
            },
          ] as never
        }
      />
    );

    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });
});
