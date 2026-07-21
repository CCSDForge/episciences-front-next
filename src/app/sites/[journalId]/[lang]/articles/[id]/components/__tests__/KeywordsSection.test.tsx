import { render } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import KeywordsSection from '../KeywordsSection';

describe('KeywordsSection', () => {
  it('returns null when keywordsData is null or undefined', () => {
    const { container: c1 } = render(
      <KeywordsSection keywordsData={null} currentLanguage="en" />
    );
    expect(c1).toBeEmptyDOMElement();

    const { container: c2 } = render(
      <KeywordsSection keywordsData={undefined} currentLanguage="en" />
    );
    expect(c2).toBeEmptyDOMElement();
  });

  it('returns null for an empty array', () => {
    const { container } = render(<KeywordsSection keywordsData={[]} currentLanguage="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a flat list when keywordsData is a simple array', () => {
    const { container, getByText } = render(
      <KeywordsSection keywordsData={['graph theory', 'topology']} currentLanguage="en" />
    );

    expect(container.querySelector('ul.keywords-list')).toBeInTheDocument();
    expect(getByText('graph theory')).toBeInTheDocument();
    expect(getByText('topology')).toBeInTheDocument();
  });

  it('renders without a language badge when keywords resolve to a single language', () => {
    const { container, getByText } = render(
      <KeywordsSection keywordsData={{ en: ['alpha', 'beta'] }} currentLanguage="en" />
    );

    expect(container.querySelector('.keywords-multilingual')).not.toBeInTheDocument();
    const list = container.querySelector('ul.keywords-list')!;
    expect(list).toHaveAttribute('dir', 'ltr');
    expect(getByText('alpha')).toBeInTheDocument();
    expect(getByText('beta')).toBeInTheDocument();
  });

  it('groups keywords by language with badges and a separator between groups', () => {
    const { container, getByText } = render(
      <KeywordsSection
        keywordsData={{ en: ['alpha'], fr: ['bêta'] }}
        currentLanguage="en"
      />
    );

    expect(container.querySelector('.keywords-multilingual')).toBeInTheDocument();
    const groups = container.querySelectorAll('.language-group');
    expect(groups).toHaveLength(2);
    expect(container.querySelectorAll('.language-badge').length).toBe(2);
    expect(container.querySelectorAll('.language-separator').length).toBe(1);
    expect(getByText('alpha')).toBeInTheDocument();
    expect(getByText('bêta')).toBeInTheDocument();
  });

  it('treats a non-language-code key as belonging to the current language', () => {
    const { container } = render(
      <KeywordsSection keywordsData={{ customKey: ['solo keyword'] }} currentLanguage="en" />
    );

    // A single resulting group (mapped to currentLanguage) renders without the badge wrapper.
    expect(container.querySelector('.keywords-multilingual')).not.toBeInTheDocument();
    expect(container.querySelector('ul.keywords-list')).toHaveAttribute('dir', 'ltr');
  });

  it('deduplicates, trims and filters out non-string / blank values', () => {
    const { container, getAllByText } = render(
      <KeywordsSection
        keywordsData={{ en: ['dup', ' dup ', '   ', 42, null] }}
        currentLanguage="en"
      />
    );

    expect(getAllByText('dup')).toHaveLength(1);
    expect(container.querySelectorAll('li')).toHaveLength(1);
  });

  it('accepts a single string value (not wrapped in an array) per language key', () => {
    const { getByText } = render(
      <KeywordsSection keywordsData={{ en: 'lone keyword' }} currentLanguage="en" />
    );

    expect(getByText('lone keyword')).toBeInTheDocument();
  });

  it('returns null when the object has no extractable keywords', () => {
    const { container } = render(
      <KeywordsSection keywordsData={{ en: [], fr: [42, null] }} currentLanguage="en" />
    );

    expect(container).toBeEmptyDOMElement();
  });
});
