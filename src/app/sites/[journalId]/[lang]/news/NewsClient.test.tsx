import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useRouter, useSearchParams } from 'next/navigation';
import NewsClient from './NewsClient';
import { fetchNews } from '@/services/news';
import { INews } from '@/services/news';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'fr', changeLanguage: vi.fn() },
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: vi.fn(() => ({ push: vi.fn() })),
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => '/news'),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({
      i18nReducer: { language: 'fr' },
      journalReducer: { currentJournal: { code: 'journal', name: 'Journal' } },
    }),
}));

vi.mock('@/services/news', () => ({
  fetchNews: vi.fn(),
}));

vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock('next/dynamic', () => ({
  default: () => (props: any) => (
    <div data-testid="news-mobile-modal">
      <button onClick={() => props.onUpdateYearsCallback([{ year: 2024, isSelected: true }])}>
        apply-years
      </button>
      <button onClick={() => props.onCloseCallback()}>close-modal</button>
    </div>
  ),
}));

const mockNews: INews[] = [
  {
    id: 1,
    title: { fr: 'News 1', en: 'News 1' },
    content: { fr: 'Content 1', en: 'Content 1' },
    publicationDate: '2024-01-01',
    author: 'Author 1',
  } as unknown as INews,
  {
    id: 2,
    title: { fr: 'News 2', en: 'News 2' },
    content: { fr: 'Content 2', en: 'Content 2' },
    publicationDate: '2024-02-01',
    author: 'Author 2',
  } as unknown as INews,
];

const initialNews = {
  data: mockNews,
  totalItems: 2,
  range: { years: [2023, 2024] },
};

describe('NewsClient', () => {
  beforeEach(() => {
    vi.mocked(fetchNews).mockResolvedValue(initialNews as any);
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams() as any);
  });

  it('renders the initial news list', async () => {
    render(<NewsClient initialNews={initialNews} lang="fr" />);

    await waitFor(() => expect(fetchNews).toHaveBeenCalled());
    expect(screen.getByText('News 1')).toBeInTheDocument();
    expect(screen.getByText('News 2')).toBeInTheDocument();
  });

  it('fetches news on mount with the current journal rvcode', async () => {
    render(<NewsClient initialNews={initialNews} lang="fr" />);

    await waitFor(() =>
      expect(fetchNews).toHaveBeenCalledWith(
        expect.objectContaining({ rvcode: 'journal', page: 1, itemsPerPage: 10 })
      )
    );
  });

  it('switches between list and tile rendering modes', async () => {
    render(<NewsClient initialNews={initialNews} lang="fr" />);
    await waitFor(() => expect(fetchNews).toHaveBeenCalled());

    const tileButton = screen.getByText('common.renderingMode.tile').closest('[role="button"]')!;
    fireEvent.click(tileButton);

    expect(tileButton).toHaveAttribute('aria-pressed', 'true');
  });

  it('toggles a year filter via the sidebar and navigates with the years query param', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<NewsClient initialNews={initialNews} lang="fr" />);
    await waitFor(() => expect(fetchNews).toHaveBeenCalled());

    const yearButton = screen.getByText('2024');
    fireEvent.click(yearButton);

    expect(mockPush).toHaveBeenCalledWith('/news?page=1&years=2024');
  });

  it('opens the mobile filters modal and applies selected years from it', async () => {
    const mockPush = vi.fn();
    vi.mocked(useRouter).mockReturnValue({ push: mockPush } as any);

    render(<NewsClient initialNews={initialNews} lang="fr" />);
    await waitFor(() => expect(fetchNews).toHaveBeenCalled());

    const filterTile = document.querySelector('.news-filtersMobile-tile') as HTMLElement;
    fireEvent.click(filterTile);

    const modal = await screen.findByTestId('news-mobile-modal');
    expect(modal).toBeInTheDocument();

    fireEvent.click(screen.getByText('apply-years'));
    expect(mockPush).toHaveBeenCalledWith('/news?page=1&years=2024');

    fireEvent.click(screen.getByText('close-modal'));
    expect(screen.queryByTestId('news-mobile-modal')).not.toBeInTheDocument();
  });

  it('reads the selected years from the URL and marks them selected in the sidebar', async () => {
    vi.mocked(useSearchParams).mockReturnValue(new URLSearchParams('years=2023') as any);

    render(<NewsClient initialNews={initialNews} lang="fr" />);
    await waitFor(() => expect(fetchNews).toHaveBeenCalled());

    const selectedYear = document.querySelector('.newsSidebar-years-list-year-selected');
    expect(selectedYear).toHaveTextContent('2023');
  });

  it('shows a loader while fetching and hides it once data resolves', async () => {
    let resolveFetch: (value: unknown) => void = () => {};
    vi.mocked(fetchNews).mockReturnValue(
      new Promise(resolve => {
        resolveFetch = resolve;
      }) as any
    );

    render(<NewsClient initialNews={initialNews} lang="fr" />);

    expect(document.querySelector('.updating')).toBeInTheDocument();

    resolveFetch(initialNews);
    await waitFor(() => expect(document.querySelector('.updating')).not.toBeInTheDocument());
  });
});
