import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import SignpostingLinks from '../SignpostingLinks';
import { IArticle } from '@/types/article';

const baseArticle: IArticle = {
  id: 1,
  title: 'A Sample Article',
  authors: [{ fullname: 'Jane Doe', orcid: '0000-0001-2345-6789' }, { fullname: 'No Orcid' }],
  publicationDate: '2024-01-01',
  repositoryName: 'HAL',
  repositoryIdentifier: 'hal-123',
  doi: '10.1234/abc',
  pdfLink: 'https://example.com/article.pdf',
  license: 'https://creativecommons.org/licenses/by/4.0/',
};

function renderLinks(article: IArticle) {
  render(<SignpostingLinks article={article} rvcode="epijinfo" id="42" lang="en" />);
  // React 19 hoists <link> elements to document.head as "resources".
  return Array.from(document.head.querySelectorAll('link'));
}

describe('SignpostingLinks', () => {
  it('renders the cite-as, author, item and license links when data is present', () => {
    const links = renderLinks(baseArticle);

    expect(links.find(l => l.getAttribute('rel') === 'cite-as')).toHaveAttribute(
      'href',
      'https://doi.org/10.1234/abc'
    );
    expect(links.find(l => l.getAttribute('rel') === 'type')).toHaveAttribute(
      'href',
      'https://schema.org/ScholarlyArticle'
    );
    const authorLinks = links.filter(l => l.getAttribute('rel') === 'author');
    expect(authorLinks).toHaveLength(1);
    expect(authorLinks[0]).toHaveAttribute('href', 'https://orcid.org/0000-0001-2345-6789');

    expect(links.find(l => l.getAttribute('rel') === 'item')).toHaveAttribute(
      'href',
      'https://example.com/article.pdf'
    );
    expect(links.find(l => l.getAttribute('rel') === 'license')).toHaveAttribute(
      'href',
      'https://creativecommons.org/licenses/by/4.0/'
    );

    const describedByLinks = links.filter(l => l.getAttribute('rel') === 'describedby');
    expect(describedByLinks.length).toBeGreaterThan(0);
    expect(describedByLinks[0]).toHaveAttribute(
      'href',
      expect.stringContaining('https://epijinfo.episciences.org/en/articles/42/')
    );

    expect(links.find(l => l.getAttribute('rel') === 'linkset')).toHaveAttribute(
      'href',
      'https://epijinfo.episciences.org/en/articles/42/linkset'
    );
  });

  it('omits cite-as, item and license links when the underlying data is absent', () => {
    const minimalArticle: IArticle = {
      ...baseArticle,
      doi: '',
      pdfLink: undefined,
      license: undefined,
      authors: [],
    };

    const links = renderLinks(minimalArticle);

    expect(links.find(l => l.getAttribute('rel') === 'cite-as')).toBeUndefined();
    expect(links.find(l => l.getAttribute('rel') === 'item')).toBeUndefined();
    expect(links.find(l => l.getAttribute('rel') === 'license')).toBeUndefined();
    expect(links.filter(l => l.getAttribute('rel') === 'author')).toHaveLength(0);
  });
});
