import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SectionDetailsClient from '../SectionDetailsClient';
import { ISection } from '@/types/section';
import { IArticle } from '@/types/article';

const changeLanguageMock = vi.fn();

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: changeLanguageMock },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({ journalId: 'journal' })),
  usePathname: vi.fn(() => '/sections/1'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockSection: ISection = {
  id: 1,
  title: { fr: 'Ma section', en: 'My section' },
  articles: [],
} as unknown as ISection;

function makeArticle(id: number, title = `Article ${id}`): IArticle {
  return {
    id,
    title,
    authors: [{ fullname: 'Jane Doe' }],
    publicationDate: '2024-01-01',
    repositoryName: 'repo',
    repositoryIdentifier: 'repo-id',
    doi: '10.1234/abc',
  } as unknown as IArticle;
}

describe('SectionDetailsClient', () => {
  it('renders the section title as the page heading', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getByRole('heading', { name: 'Ma section', level: 1 })).toBeInTheDocument();
  });

  it('renders the section description when provided', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription="Une description"
      />
    );

    expect(screen.getByText('Une description')).toBeInTheDocument();
  });

  it('does not render a description block when sectionDescription is empty', () => {
    const { container } = render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(
      container.querySelector('.sectionDetails-content-results-content-description')
    ).not.toBeInTheDocument();
  });

  it('shows the empty state and singular article count when there are no articles', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getByText('pages.sections.noArticlesTitle')).toBeInTheDocument();
    expect(screen.getByText('pages.sections.noArticlesMessage')).toBeInTheDocument();
    // The count is rendered both in the sidebar and in the mobile-only count block.
    expect(screen.getAllByText('0 common.article').length).toBeGreaterThan(0);
  });

  it('renders article cards and the plural count when there is more than one article', () => {
    const articles = [makeArticle(1), makeArticle(2)];
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={articles}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getByText('Article 1')).toBeInTheDocument();
    expect(screen.getByText('Article 2')).toBeInTheDocument();
    expect(screen.getAllByText('2 common.articles').length).toBeGreaterThan(0);
    expect(screen.queryByText('pages.sections.noArticlesTitle')).not.toBeInTheDocument();
  });

  it('renders the singular article count when there is exactly one article', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[makeArticle(1)]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getAllByText('1 common.article').length).toBeGreaterThan(0);
  });

  it('renders the section committee names when present', () => {
    const sectionWithCommittee: ISection = {
      ...mockSection,
      committee: [
        { uuid: 'a', screenName: 'Alice' },
        { uuid: 'b', screenName: 'Bob' },
      ],
    } as unknown as ISection;

    render(
      <SectionDetailsClient
        section={sectionWithCommittee}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getAllByText(/Alice, Bob/).length).toBeGreaterThan(0);
  });

  it('does not render committee info when committee is absent', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(
      document.querySelector('.sectionDetails-content-results-content-committee')
    ).not.toBeInTheDocument();
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', sections: 'Rubriques' }}
      />
    );

    expect(screen.getAllByText(/Rubriques/).length).toBeGreaterThan(0);
  });

  it('falls back to translation keys for breadcrumb labels when none are provided', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getAllByText(/pages.sections.title/).length).toBeGreaterThan(0);
  });

  it('synchronizes i18n language with the lang prop when they differ', () => {
    render(
      <SectionDetailsClient
        section={mockSection}
        articles={[]}
        sectionId="1"
        lang="en"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(changeLanguageMock).toHaveBeenCalledWith('en');
  });

  it('updates displayed articles when the articles prop changes', () => {
    const { rerender } = render(
      <SectionDetailsClient
        section={mockSection}
        articles={[makeArticle(1)]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getByText('Article 1')).toBeInTheDocument();

    rerender(
      <SectionDetailsClient
        section={mockSection}
        articles={[makeArticle(2)]}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    expect(screen.getByText('Article 2')).toBeInTheDocument();
    expect(screen.queryByText('Article 1')).not.toBeInTheDocument();
  });
});
