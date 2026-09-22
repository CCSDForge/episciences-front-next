import { render, screen, fireEvent } from '@testing-library/react';
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

const pushMock = vi.fn();
const replaceMock = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: pushMock, replace: replaceMock })),
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

    const committee = document.querySelector('.sectionDetails-content-results-content-committee');
    expect(committee).toHaveTextContent('common.editorsLabel Alice, Bob');
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

  describe('document type / year filters', () => {
    const datedArticles = [
      { ...makeArticle(1), publicationDate: '2024-05-01', tag: 'article' },
      { ...makeArticle(2), publicationDate: '2023-05-01', tag: 'article' },
      { ...makeArticle(3), publicationDate: '2023-09-01', tag: 'article' },
    ] as IArticle[];

    const renderWithArticles = (list: IArticle[]) =>
      render(
        <SectionDetailsClient
          section={mockSection}
          articles={list}
          sectionId="1"
          sectionTitle="Ma section"
          sectionDescription=""
        />
      );

    it('does not render filters when they cannot narrow the list', () => {
      renderWithArticles([makeArticle(1), makeArticle(2)]);
      expect(screen.queryByText('common.filters.years')).not.toBeInTheDocument();
      expect(screen.queryByText('common.filters.filter')).not.toBeInTheDocument();
    });

    it('renders the years filter, newest first, and hides the single-choice type filter', () => {
      renderWithArticles(datedArticles);
      expect(screen.getByText('common.filters.years')).toBeInTheDocument();
      expect(screen.queryByText('common.filters.documentTypes')).not.toBeInTheDocument();
      const labels = screen.getAllByRole('button', { name: /^20\d\d$/ }).map(b => b.textContent);
      expect(labels).toEqual(['2024', '2023']);
    });

    it('filters the list by year and shows a tag, without touching the URL on page 1', () => {
      pushMock.mockClear();
      replaceMock.mockClear();
      renderWithArticles(datedArticles);

      fireEvent.click(screen.getByRole('button', { name: '2023' }));

      expect(screen.queryByText('Article 1')).not.toBeInTheDocument();
      expect(screen.getByText('Article 2')).toBeInTheDocument();
      expect(screen.getByText('Article 3')).toBeInTheDocument();
      expect(screen.getByText('common.filters.clearAll')).toBeInTheDocument();
      expect(pushMock).not.toHaveBeenCalled();
      expect(replaceMock).not.toHaveBeenCalled();
    });

    it('drops ?page= by replacing the URL (no history entry) when a filter changes', () => {
      replaceMock.mockClear();
      globalThis.history.replaceState(null, '', '/sections/1?page=2');
      try {
        renderWithArticles(datedArticles);
        fireEvent.click(screen.getByRole('button', { name: '2023' }));
        expect(replaceMock).toHaveBeenCalledWith('/sections/1', { scroll: false });
        expect(pushMock).not.toHaveBeenCalled();
      } finally {
        globalThis.history.replaceState(null, '', '/');
      }
    });

    it('counts the articles matching the filters', () => {
      renderWithArticles(datedArticles);
      expect(screen.getAllByText('3 common.articles').length).toBeGreaterThan(0);

      fireEvent.click(screen.getByRole('button', { name: '2024' }));

      expect(screen.queryByText('3 common.articles')).not.toBeInTheDocument();
      expect(screen.getAllByText('1 common.article').length).toBe(2);
    });

    it('clears all filters', () => {
      renderWithArticles(datedArticles);

      fireEvent.click(screen.getByRole('button', { name: '2024' }));
      expect(screen.queryByText('Article 2')).not.toBeInTheDocument();

      fireEvent.click(screen.getByText('common.filters.clearAll'));
      expect(screen.getByText('Article 1')).toBeInTheDocument();
      expect(screen.getByText('Article 2')).toBeInTheDocument();
      expect(screen.queryByText('common.filters.clearAll')).not.toBeInTheDocument();
    });
  });

  it('lists articles from the most recent to the oldest', () => {
    const list = [
      { ...makeArticle(1), publicationDate: '2019-01-01' },
      { ...makeArticle(2), publicationDate: '2024-06-01' },
      { ...makeArticle(3), publicationDate: '2021-03-15' },
    ] as IArticle[];

    render(
      <SectionDetailsClient
        section={mockSection}
        articles={list}
        sectionId="1"
        sectionTitle="Ma section"
        sectionDescription=""
      />
    );

    const titles = screen.getAllByText(/^Article \d$/).map(el => el.textContent);
    expect(titles).toEqual(['Article 2', 'Article 3', 'Article 1']);
  });

  describe('committee ORCID links', () => {
    const sectionWithCommittee = {
      ...mockSection,
      committee: [
        { uuid: 'a', screenName: 'Corina Cirstea', orcid: '0000-0003-3165-5678' },
        { uuid: 'b', screenName: 'Henning Fernau', orcid: '' },
        { uuid: 'c', screenName: 'Val Tannen', orcid: null },
      ],
    } as unknown as ISection;

    const renderCommittee = () =>
      render(
        <SectionDetailsClient
          section={sectionWithCommittee}
          articles={[]}
          sectionId="1"
          sectionTitle="Ma section"
          sectionDescription=""
        />
      );

    it('renders an accessible ORCID link (opening in a new window) for members with an ORCID', () => {
      renderCommittee();

      // Desktop and mobile committee blocks are both rendered (CSS picks one)
      const links = screen.getAllByRole('link', {
        name: 'common.orcidOf components.header.newWindow',
      });
      expect(links).toHaveLength(2);
      links.forEach(link => {
        expect(link).toHaveAttribute('href', 'https://orcid.org/0000-0003-3165-5678');
        expect(link).toHaveAttribute('target', '_blank');
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });

    it('renders members without ORCID as plain names', () => {
      renderCommittee();
      expect(screen.getAllByText('Henning Fernau')[0].closest('a')).toBeNull();
      expect(screen.getAllByText('Val Tannen')[0].closest('a')).toBeNull();
    });
  });
});
