import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import ForAuthorsClient from '../ForAuthorsClient';
import { ForAuthorsPage } from '@/services/forAuthors';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: () => undefined,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/test/en/for-authors',
}));

// Breadcrumb pulls in JsonLd/MathJax; not relevant to ForAuthorsClient's own logic.
vi.mock('@/components/Breadcrumb/Breadcrumb', () => ({
  default: ({ crumbLabel }: { crumbLabel: string }) => (
    <nav data-testid="breadcrumb">{crumbLabel}</nav>
  ),
}));

const editorialWorkflowPage: ForAuthorsPage = {
  title: { en: 'Editorial Workflow', fr: 'Processus éditorial' },
  content: {
    en: '## Submission\n\nDescribe how to submit.\n\n## Review\n\nDescribe the review process.',
    fr: '## Soumission\n\nDécrivez comment soumettre.',
  },
  date_updated: '2026-01-15',
};

const prepareSubmissionPage: ForAuthorsPage = {
  title: { en: 'Prepare your submission', fr: 'Préparez votre soumission' },
  content: {
    en: '### Format your manuscript\n\nUse LaTeX.\n\n### Check references\n\nVerify citations.',
    fr: '### Formatez votre manuscrit\n\nUtilisez LaTeX.',
  },
  date_updated: '2026-02-20',
};

const breadcrumbLabels = { parents: [{ path: '/', label: 'Home >' }], current: 'For Authors' };

describe('ForAuthorsClient', () => {
  it('renders the breadcrumb and page title from breadcrumbLabels', () => {
    render(
      <ForAuthorsClient
        editorialWorkflowPage={editorialWorkflowPage}
        prepareSubmissionPage={prepareSubmissionPage}
        lang="en"
        breadcrumbLabels={breadcrumbLabels}
      />
    );

    expect(screen.getByTestId('breadcrumb')).toHaveTextContent('For Authors');
    expect(screen.getByRole('heading', { level: 1, name: 'For Authors' })).toBeInTheDocument();
  });

  it('shows "No content available" when both pages are empty', () => {
    render(
      <ForAuthorsClient editorialWorkflowPage={null} prepareSubmissionPage={null} lang="en" />
    );

    expect(screen.getByText('No content available')).toBeInTheDocument();
  });

  describe('page title vs. injected synthetic heading', () => {
    it('shows the page title as a static heading when content already starts with its own H2', () => {
      // Regression for 55a881d: a page whose content starts with H2 must not
      // get its title re-injected as an empty collapsible section.
      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={null}
          lang="en"
        />
      );

      const staticTitle = container.querySelector('.forAuthors-content-body-pageTitle');
      expect(staticTitle).toHaveTextContent('Editorial Workflow');

      // The collapsible H2 sections are the real headings from the markdown, not the title -
      // the title itself is a plain static heading, not a clickable collapsible "button".
      expect(screen.getByRole('heading', { level: 2, name: 'Submission' })).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 2, name: 'Review' })).toBeInTheDocument();
      expect(staticTitle).not.toHaveAttribute('role', 'button');
    });

    it('injects the page title as the collapsible H2 when content has no leading H2 (numbered cards)', () => {
      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={null}
          prepareSubmissionPage={prepareSubmissionPage}
          lang="en"
        />
      );

      // No separate static title - the title itself becomes the collapsible H2.
      expect(container.querySelector('.forAuthors-content-body-pageTitle')).not.toBeInTheDocument();
      expect(
        screen.getByRole('heading', { level: 2, name: 'Prepare your submission' })
      ).toBeInTheDocument();

      // H3s under the synthetic H2 become numbered cards, not collapsible sub-sections.
      const card1 = screen.getByRole('heading', { level: 3, name: 'Format your manuscript' });
      const card2 = screen.getByRole('heading', { level: 3, name: 'Check references' });
      expect(card1).toBeInTheDocument();
      expect(card2).toBeInTheDocument();
      expect(screen.getByText('Use LaTeX.')).toBeInTheDocument();
      expect(screen.getByText('Verify citations.')).toBeInTheDocument();
    });

    it('does not crash and keeps cards grouped under their own H2 when numbered content has multiple H2 sections', () => {
      // Regression for 5c2f2e1: leftover card content used to leak across an H2
      // boundary and crash on the next (empty) cards array.
      const multiSectionContent: ForAuthorsPage = {
        title: { en: 'Prepare your submission' },
        content: {
          en: '## Before Submission\n\n### Check formatting\n\nMake sure formatting is correct.\n\n## During Submission\n\n### Upload files\n\nUpload your manuscript files.',
        },
      };

      expect(() =>
        render(
          <ForAuthorsClient
            editorialWorkflowPage={null}
            prepareSubmissionPage={multiSectionContent}
            lang="en"
          />
        )
      ).not.toThrow();

      const beforeHeading = screen.getByRole('heading', { level: 2, name: 'Before Submission' });
      const duringHeading = screen.getByRole('heading', { level: 2, name: 'During Submission' });
      expect(beforeHeading).toBeInTheDocument();
      expect(duringHeading).toBeInTheDocument();

      expect(
        screen.getByRole('heading', { level: 3, name: 'Check formatting' })
      ).toBeInTheDocument();
      expect(screen.getByRole('heading', { level: 3, name: 'Upload files' })).toBeInTheDocument();
      expect(screen.getByText('Make sure formatting is correct.')).toBeInTheDocument();
      expect(screen.getByText('Upload your manuscript files.')).toBeInTheDocument();
    });
  });

  describe('section collapse toggle', () => {
    // Re-queries the header after each interaction rather than reusing the originally
    // captured node: react-markdown remounts the rendered subtree when a custom
    // component's content changes, so a stale reference would not reflect the update.
    const getSectionHeader = (name: string): HTMLElement =>
      screen.getByRole('heading', { level: 2, name }).closest('[role="button"]') as HTMLElement;

    it('toggles a section on click and updates aria-expanded independently of other sections', async () => {
      const user = userEvent.setup();
      render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={null}
          lang="en"
        />
      );

      expect(getSectionHeader('Submission')).toHaveAttribute('aria-expanded', 'true');
      expect(getSectionHeader('Review')).toHaveAttribute('aria-expanded', 'true');

      await user.click(getSectionHeader('Submission'));

      expect(getSectionHeader('Submission')).toHaveAttribute('aria-expanded', 'false');
      expect(getSectionHeader('Review')).toHaveAttribute('aria-expanded', 'true');

      await user.click(getSectionHeader('Submission'));
      expect(getSectionHeader('Submission')).toHaveAttribute('aria-expanded', 'true');
    });

    it('toggles a section via the keyboard (Enter)', async () => {
      const user = userEvent.setup();
      render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={null}
          lang="en"
        />
      );

      getSectionHeader('Submission').focus();
      await user.keyboard('{Enter}');
      expect(getSectionHeader('Submission')).toHaveAttribute('aria-expanded', 'false');
    });
  });

  describe('sidebar', () => {
    it('renders top-level and nested sidebar headers from both pages', () => {
      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={prepareSubmissionPage}
          lang="en"
        />
      );

      const sidebar = container.querySelector('.forAuthorsSidebar') as HTMLElement;
      expect(within(sidebar).getByText('Submission')).toBeInTheDocument();
      expect(within(sidebar).getByText('Review')).toBeInTheDocument();
      expect(within(sidebar).getByText('Prepare your submission')).toBeInTheDocument();
      // Numbered nested entries for the prepareSubmission cards.
      expect(within(sidebar).getByText('1. Format your manuscript')).toBeInTheDocument();
      expect(within(sidebar).getByText('2. Check references')).toBeInTheDocument();
    });

    it('collapses only the nested children when the sidebar caret is clicked', async () => {
      const user = userEvent.setup();
      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={null}
          prepareSubmissionPage={prepareSubmissionPage}
          lang="en"
        />
      );

      const sidebar = container.querySelector('.forAuthorsSidebar') as HTMLElement;
      expect(within(sidebar).getByText('1. Format your manuscript')).toBeInTheDocument();

      const caret = sidebar.querySelector('.forAuthorsSidebar-header-title-caret') as HTMLElement;
      await user.click(caret);

      expect(within(sidebar).queryByText('1. Format your manuscript')).not.toBeInTheDocument();
      // Top-level header itself stays visible.
      expect(within(sidebar).getByText('Prepare your submission')).toBeInTheDocument();
    });
  });

  describe('language fallback notice', () => {
    it('shows a notice when requested-language content falls back to the default language', () => {
      const frenchOnlyPage: ForAuthorsPage = {
        title: { en: 'Editorial Workflow' },
        content: { en: '## Submission\n\nDescribe how to submit.' },
      };

      render(
        <ForAuthorsClient
          editorialWorkflowPage={frenchOnlyPage}
          prepareSubmissionPage={null}
          lang="fr"
        />
      );

      expect(screen.getByRole('status')).toHaveTextContent('common.contentNotInLanguage');
    });

    it('shows no notice when content is available in the requested language', () => {
      render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={null}
          lang="en"
        />
      );

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  describe('last updated date', () => {
    it('renders the most recent date_updated across both pages', () => {
      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={editorialWorkflowPage}
          prepareSubmissionPage={prepareSubmissionPage}
          lang="en"
        />
      );

      // prepareSubmissionPage.date_updated (2026-02-20) is more recent than
      // editorialWorkflowPage.date_updated (2026-01-15).
      const lastUpdated = container.querySelector('.forAuthors-last-updated');
      expect(lastUpdated).toBeInTheDocument();
      expect(lastUpdated?.textContent).toContain('common.lastUpdated');
    });

    it('renders no last-updated line when neither page has a date_updated', () => {
      const noDateEditorial: ForAuthorsPage = { ...editorialWorkflowPage, date_updated: undefined };
      const noDatePrepare: ForAuthorsPage = { ...prepareSubmissionPage, date_updated: undefined };

      const { container } = render(
        <ForAuthorsClient
          editorialWorkflowPage={noDateEditorial}
          prepareSubmissionPage={noDatePrepare}
          lang="en"
        />
      );

      expect(container.querySelector('.forAuthors-last-updated')).not.toBeInTheDocument();
    });
  });
});
