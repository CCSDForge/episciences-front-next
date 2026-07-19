import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import SectionsClient from './SectionsClient';
import { ISection } from '@/types/section';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/sections'),
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

const mockSections: ISection[] = [
  { id: 1, title: { fr: 'Section 1', en: 'Section 1' }, articles: [] } as unknown as ISection,
  { id: 2, title: { fr: 'Section 2', en: 'Section 2' }, articles: [] } as unknown as ISection,
];

const initialSections = {
  data: mockSections,
  totalItems: 2,
  articlesCount: 5,
};

describe('SectionsClient', () => {
  it('renders the provided sections', () => {
    render(<SectionsClient initialSections={initialSections} initialPage={1} lang="fr" />);

    expect(screen.getByText(/Section 1/)).toBeInTheDocument();
    expect(screen.getByText(/Section 2/)).toBeInTheDocument();
  });

  it('renders the plural sections and articles counts', () => {
    render(<SectionsClient initialSections={initialSections} initialPage={1} lang="fr" />);

    expect(screen.getByText('2 common.sections')).toBeInTheDocument();
    expect(screen.getByText('5 common.articles')).toBeInTheDocument();
  });

  it('renders the singular counts when there is exactly one section/article', () => {
    render(
      <SectionsClient
        initialSections={{ data: [mockSections[0]], totalItems: 1, articlesCount: 1 }}
        initialPage={1}
        lang="fr"
      />
    );

    expect(screen.getByText('1 common.section')).toBeInTheDocument();
    expect(screen.getByText('1 common.article')).toBeInTheDocument();
  });

  it('renders no counts when initialSections is null', () => {
    render(<SectionsClient initialSections={null} initialPage={1} lang="fr" />);

    expect(screen.queryByText(/common.sections/)).not.toBeInTheDocument();
    expect(screen.queryByText(/common.articles/)).not.toBeInTheDocument();
  });

  it('omits the articles count when articlesCount is absent', () => {
    render(
      <SectionsClient
        initialSections={{ data: mockSections, totalItems: 2 }}
        initialPage={1}
        lang="fr"
      />
    );

    expect(screen.queryByText(/common.articles/)).not.toBeInTheDocument();
  });

  it('uses custom breadcrumb labels when provided', () => {
    render(
      <SectionsClient
        initialSections={initialSections}
        initialPage={1}
        lang="fr"
        breadcrumbLabels={{ home: 'Accueil', content: 'Contenu', sections: 'Rubriques' }}
      />
    );

    expect(screen.getAllByText('Rubriques').length).toBeGreaterThan(0);
  });

  it('navigates to the requested page and scrolls to top on pagination click', () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);
    const scrollToSpy = vi.fn();
    window.scrollTo = scrollToSpy;

    const manySections = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: { fr: `Section ${i + 1}`, en: `Section ${i + 1}` },
      articles: [],
    })) as unknown as ISection[];

    render(
      <SectionsClient
        initialSections={{ data: manySections, totalItems: 25 }}
        initialPage={1}
        lang="fr"
      />
    );

    const nextButton = screen.getByLabelText('components.pagination.next');
    nextButton.click();

    expect(mockPush).toHaveBeenCalledWith('/sections?page=2');
    expect(scrollToSpy).toHaveBeenCalledWith({ top: 0, behavior: 'smooth' });
  });

  it('reads the initial page from the URL search params', () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('page=3') as any);

    const manySections = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      title: { fr: `Section ${i + 1}`, en: `Section ${i + 1}` },
      articles: [],
    })) as unknown as ISection[];

    render(
      <SectionsClient
        initialSections={{ data: manySections, totalItems: 25 }}
        initialPage={1}
        lang="fr"
      />
    );

    // Page 3 → sections 21-25 (0-indexed slice 20-30)
    expect(screen.getByText(/Section 21/)).toBeInTheDocument();
    expect(screen.queryByText(/Section 1$/)).not.toBeInTheDocument();

    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
  });
});
