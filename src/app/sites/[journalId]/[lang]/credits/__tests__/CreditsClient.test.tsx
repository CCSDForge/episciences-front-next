import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import CreditsClient from '../CreditsClient';
import { CreditsPage } from '@/services/credits';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: () => 'journal-code',
}));

// CreditsClient only needs the synchronous `initialData` on first render; the
// hook's own fetch/abort behavior is covered by useClientSideFetch's tests.
vi.mock('@/hooks/useClientSideFetch', () => ({
  useClientSideFetch: ({ initialData }: { initialData: unknown }) => ({
    data: initialData,
    isUpdating: false,
  }),
}));

// MathJax is pulled in transitively via Breadcrumb; not relevant to CreditsClient's own logic.
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const breadcrumbLabels = { home: 'Home', credits: 'Credits' };

const creditsPage: CreditsPage = {
  content: {
    en: '## Editorial team\n\nManaged by the board.\n\n## Funders\n\nSupported by our partners.',
    fr: '## Équipe éditoriale\n\nGérée par le comité.',
  },
  date_updated: '2026-02-10',
};

describe('CreditsClient', () => {
  it('renders the breadcrumb and page title from breadcrumbLabels', () => {
    render(<CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.getByText('Home >')).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 1, name: 'Credits' })).toBeInTheDocument();
  });

  it('applies the legacy "credits" CSS classes so Credits.scss keeps matching', () => {
    const { container } = render(
      <CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    expect(container.querySelector('.credits')).toBeInTheDocument();
    expect(container.querySelector('.credits-title')).toBeInTheDocument();
    expect(container.querySelector('.credits-content-body')).toBeInTheDocument();
  });

  it('renders each H2 as a collapsible section and toggles it on click', async () => {
    const user = userEvent.setup();
    render(<CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    const teamHeading = screen.getByRole('heading', { level: 2, name: 'Editorial team' });
    expect(screen.getByRole('heading', { level: 2, name: 'Funders' })).toBeInTheDocument();
    expect(screen.getByText('Managed by the board.')).toBeInTheDocument();

    const trigger = teamHeading.closest('[role="button"]') as HTMLElement;
    expect(trigger).toHaveAttribute('aria-expanded', 'true');

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  it('shows the "no content" message, translated, when there is no content', () => {
    render(<CreditsClient creditsPage={null} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.getByText('pages.credits.noContent')).toBeInTheDocument();
  });

  it('shows a language fallback notice when requested-language content is unavailable', () => {
    const englishOnlyPage: CreditsPage = {
      content: { en: '## Editorial team\n\nSome content.' },
    };

    render(
      <CreditsClient creditsPage={englishOnlyPage} lang="fr" breadcrumbLabels={breadcrumbLabels} />
    );

    expect(screen.getByRole('status')).toHaveTextContent('common.contentNotInLanguage');
  });

  it('shows no language notice when content is available in the requested language', () => {
    render(<CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />);

    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('renders the last updated date when date_updated is present', () => {
    const { container } = render(
      <CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    const lastUpdated = container.querySelector('.credits-last-updated');
    expect(lastUpdated).toBeInTheDocument();
    expect(lastUpdated?.textContent).toContain('common.lastUpdated');
  });

  it('falls back to translation keys when breadcrumbLabels is not provided', () => {
    render(<CreditsClient creditsPage={creditsPage} lang="en" />);

    expect(
      screen.getByRole('heading', { level: 1, name: 'pages.credits.title' })
    ).toBeInTheDocument();
  });

  it('renders the sidebar table of contents from the parsed sections', () => {
    const { container } = render(
      <CreditsClient creditsPage={creditsPage} lang="en" breadcrumbLabels={breadcrumbLabels} />
    );

    const sidebar = container.querySelector('.aboutSidebar') as HTMLElement;
    expect(within(sidebar).getByText('Editorial team')).toBeInTheDocument();
    expect(within(sidebar).getByText('Funders')).toBeInTheDocument();
  });
});
