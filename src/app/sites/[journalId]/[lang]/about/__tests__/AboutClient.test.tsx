import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import AboutClient from '../AboutClient';
import { AboutPage } from '@/services/about';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: () => 'journal-code',
}));

// AboutClient only needs the synchronous `initialData` on first render; the
// hook's own fetch/abort behavior is covered by useClientSideFetch's tests.
vi.mock('@/hooks/useClientSideFetch', () => ({
  useClientSideFetch: ({ initialData }: { initialData: unknown }) => ({
    data: initialData,
    isUpdating: false,
  }),
}));

// MathJax is pulled in transitively via Breadcrumb; not relevant to AboutClient's own logic.
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const breadcrumbLabels = { home: 'Home', about: 'The journal' };

const aboutPage: AboutPage = {
  content: {
    en: '## Mission\n\nWe publish open access research.\n\n## History\n\nFounded in 2010.',
    fr: '## Mission\n\nNous publions de la recherche en accès ouvert.',
  },
  date_updated: '2026-03-01',
};

describe('AboutClient', () => {
  it('renders the breadcrumb and page title from breadcrumbLabels', () => {
    render(<AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.getByText('Home >')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'The journal' })).toBeInTheDocument();
  });

  it('applies the legacy "about" CSS classes so About.scss keeps matching', () => {
    const { container } = render(
      <AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    expect(container.querySelector('.about')).toBeInTheDocument();
    expect(container.querySelector('.about-title')).toBeInTheDocument();
    expect(container.querySelector('.about-content-body')).toBeInTheDocument();
  });

  it('renders each H2 as a collapsible section and toggles it on click', async () => {
    const user = userEvent.setup();
    render(<AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    const missionHeading = screen.getByRole('heading', { level: 2, name: 'Mission' });
    expect(screen.getByRole('heading', { level: 2, name: 'History' })).toBeInTheDocument();
    expect(screen.getByText('We publish open access research.')).toBeInTheDocument();

    const trigger = missionHeading.closest('[role="button"]') as HTMLElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the "no content" message, translated, when there is no content', () => {
    render(<AboutClient initialPage={null} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.getByText('pages.about.noContent')).toBeInTheDocument();
  });

  it('shows a language fallback notice when requested-language content is unavailable', () => {
    const frenchOnlyPage: AboutPage = {
      content: { en: '## Mission\n\nSome content.' },
    };

    render(
      <AboutClient initialPage={frenchOnlyPage} lang="fr" breadcrumbLabels={breadcrumbLabels} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('common.contentNotInLanguage');
  });

  it('shows no language notice when content is available in the requested language', () => {
    render(<AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the last updated date when date_updated is present', () => {
    const { container } = render(
      <AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    const lastUpdated = container.querySelector('.about-last-updated');
    expect(lastUpdated).toBeInTheDocument();
    expect(lastUpdated?.textContent).toContain('common.lastUpdated');
  });

  it('falls back to translation keys when breadcrumbLabels is not provided', () => {
    render(<AboutClient initialPage={aboutPage} lang="en" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'pages.about.title' })
    ).toBeInTheDocument();
  });

  it('renders the sidebar table of contents from the parsed sections', () => {
    const { container } = render(
      <AboutClient initialPage={aboutPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    const sidebar = container.querySelector('.aboutSidebar') as HTMLElement;
    expect(within(sidebar).getByText('Mission')).toBeInTheDocument();
    expect(within(sidebar).getByText('History')).toBeInTheDocument();
  });
});
