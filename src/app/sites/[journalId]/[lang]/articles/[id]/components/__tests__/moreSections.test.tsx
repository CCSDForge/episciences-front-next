import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AbstractSection from '../AbstractSection';
import CollapsibleInstitutions from '../CollapsibleInstitutions';
import CitedBySection from '../CitedBySection';
import { IArticleCitedBy } from '@/types/article';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'en' },
  }),
}));

vi.mock('next/image', () => ({
  default: ({ alt }: { alt: string }) => <img alt={alt} />,
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('AbstractSection', () => {
  it('returns null when abstractData is empty', () => {
    const { container } = render(<AbstractSection abstractData={null} currentLanguage="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null for a blank string', () => {
    const { container } = render(<AbstractSection abstractData="   " currentLanguage="en" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a plain string abstract', () => {
    const { container } = render(
      <AbstractSection abstractData="A simple abstract" currentLanguage="en" />
    );
    expect(container.querySelector('.abstract-single')).toHaveTextContent('A simple abstract');
  });

  it('renders a single-language object without a badge', () => {
    const { container } = render(
      <AbstractSection abstractData={{ en: 'English abstract' }} currentLanguage="en" />
    );
    expect(container.querySelector('.abstract-multilingual')).not.toBeInTheDocument();
    expect(container.querySelector('.abstract-single')).toHaveAttribute('dir', 'ltr');
  });

  it('renders multiple languages with badges and a separator', () => {
    const { container } = render(
      <AbstractSection
        abstractData={{ en: 'English abstract', fr: 'Résumé français' }}
        currentLanguage="en"
      />
    );
    expect(container.querySelectorAll('.language-group')).toHaveLength(2);
    expect(container.querySelectorAll('.language-badge')).toHaveLength(2);
    expect(container.querySelectorAll('.language-separator')).toHaveLength(1);
  });

  it('returns null when the object has no usable string values', () => {
    const { container } = render(
      <AbstractSection abstractData={{ en: '', fr: 42 }} currentLanguage="en" />
    );
    expect(container).toBeEmptyDOMElement();
  });
});

describe('CollapsibleInstitutions', () => {
  const authors = [
    { fullname: 'Jane Doe', orcid: '0000-0001', institutionsKeys: [0] },
    { fullname: 'No Orcid Author', institutionsKeys: [] },
  ];
  const institutions = [{ name: 'MIT', rorId: 'https://ror.org/1' } as never];

  it('renders authors without the institutions block when there are none', () => {
    const { container } = render(
      <CollapsibleInstitutions authors={authors} institutions={[]} isMobile={false} />
    );

    expect(container).toHaveTextContent('Jane Doe');
    expect(
      container.querySelector('.articleDetails-content-article-authors-withInstitutions')
    ).not.toBeInTheDocument();
  });

  it('renders the ORCID link only for authors that have one', () => {
    render(<CollapsibleInstitutions authors={authors} institutions={[]} isMobile={false} />);
    expect(screen.getAllByRole('link')).toHaveLength(1);
  });

  it('renders institutions and collapses them on caret click', () => {
    const { container } = render(
      <CollapsibleInstitutions authors={authors} institutions={institutions} isMobile={false} />
    );

    expect(
      container.querySelector('.articleDetails-content-article-institutions')
    ).toHaveTextContent('MIT');

    const caret = screen.getByLabelText('Collapse institutions');
    fireEvent.click(caret);

    expect(
      container.querySelector('.articleDetails-content-article-institutions')
    ).not.toHaveTextContent('MIT');
    expect(screen.getByLabelText('Expand institutions')).toBeInTheDocument();
  });

  it('applies the mobile modifier classes when isMobile is true', () => {
    const { container } = render(
      <CollapsibleInstitutions authors={authors} institutions={institutions} isMobile={true} />
    );

    expect(
      container.querySelector('.articleDetails-content-article-authors-withInstitutions-mobile')
    ).toBeInTheDocument();
  });
});

describe('CitedBySection', () => {
  it('returns null when citedBy is empty or absent', () => {
    const { container } = render(<CitedBySection citedBy={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders citation details grouped by source', () => {
    const citedBy: IArticleCitedBy[] = [
      {
        source: 'Crossref',
        citations: [
          {
            title: 'Citing paper',
            sourceTitle: 'Some Journal',
            authors: [{ fullname: 'Alice', orcid: '0000-0002' }, { fullname: 'Bob' }],
            reference: { volume: '3', year: '2023', page: '42' },
            doi: '10.1234/cited',
          },
        ],
      },
    ];

    render(<CitedBySection citedBy={citedBy} />);

    expect(screen.getByText(/Crossref/)).toBeInTheDocument();
    expect(screen.getByText('Citing paper')).toBeInTheDocument();
    expect(screen.getByText('Some Journal')).toBeInTheDocument();
    expect(screen.getByText('Alice', { exact: false })).toBeInTheDocument();
    expect(screen.getByText('Bob', { exact: false })).toBeInTheDocument();
    const doiLink = screen.getByRole('link', { name: /10\.1234\/cited/ });
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/cited');
  });
});
