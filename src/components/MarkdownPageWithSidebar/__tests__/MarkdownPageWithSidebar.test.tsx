import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MarkdownPageWithSidebar from '../MarkdownPageWithSidebar';
import { BreadcrumbItem } from '@/utils/breadcrumbs';

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: {
      language: 'en',
      changeLanguage: vi.fn(),
    },
  }),
}));

// Mock redux hooks
vi.mock('@/hooks/store', () => ({
  useAppSelector: () => 'journal-code',
}));

describe('MarkdownPageWithSidebar', () => {
  const mockBreadcrumbLabels: { parents: BreadcrumbItem[]; current: string } = {
    parents: [{ path: '/', label: 'Home >' }],
    current: 'Test Page',
  };

  const mockContent = `
## Section 1
Content for section 1

### Subsection 1.1
Content for subsection 1.1

## Section 2
Content for section 2
  `.trim();

  beforeEach(() => {
    // Clear location hash before each test
    window.location.hash = '';
  });

  it('renders title and breadcrumbs correctly', () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    expect(screen.getByRole('heading', { name: 'Test Page', level: 1 })).toBeInTheDocument();
    expect(screen.getByText('Home >')).toBeInTheDocument();
  });

  it('parses markdown into sections with correct IDs', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    // Check that H2 sections are rendered with IDs
    await waitFor(() => {
      const section1 = document.getElementById('section-1');
      const section2 = document.getElementById('section-2');
      expect(section1).toBeInTheDocument();
      expect(section2).toBeInTheDocument();
    });
  });

  it('generates sidebar with headers and sub-headers', async () => {
    const { container } = render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    // Check that sidebar headers are rendered in the aboutSidebar element
    await waitFor(() => {
      const sidebar = container.querySelector('.aboutSidebar');
      expect(sidebar).toBeInTheDocument();
      expect(sidebar?.textContent).toContain('Section 1');
      expect(sidebar?.textContent).toContain('Section 2');
      expect(sidebar?.textContent).toContain('Subsection 1.1');
    });
  });

  it('toggles section collapse/expand on click', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Section 1', level: 2 })).toBeInTheDocument();
    });

    // Find the section header (the clickable div with role="button")
    const sectionHeader = screen
      .getAllByRole('button')
      .find(el => el.textContent?.includes('Section 1'));

    expect(sectionHeader).toBeInTheDocument();
    expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

    // Click to collapse
    fireEvent.click(sectionHeader!);

    await waitFor(() => {
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });

    // Click to expand again
    fireEvent.click(sectionHeader!);

    await waitFor(() => {
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');
    });
  });

  it('toggles section with keyboard (Enter key)', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Section 1', level: 2 })).toBeInTheDocument();
    });

    const sectionHeader = screen
      .getAllByRole('button')
      .find(el => el.textContent?.includes('Section 1'));

    expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

    // Press Enter to collapse
    fireEvent.keyDown(sectionHeader!, { key: 'Enter', code: 'Enter' });

    await waitFor(() => {
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('toggles section with keyboard (Space key)', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Section 1', level: 2 })).toBeInTheDocument();
    });

    const sectionHeader = screen
      .getAllByRole('button')
      .find(el => el.textContent?.includes('Section 1'));

    expect(sectionHeader).toHaveAttribute('aria-expanded', 'true');

    // Press Space to collapse
    fireEvent.keyDown(sectionHeader!, { key: ' ', code: 'Space' });

    await waitFor(() => {
      expect(sectionHeader).toHaveAttribute('aria-expanded', 'false');
    });
  });

  it('displays loader when isLoading is true', () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        isLoading={true}
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    // Check for loader (assuming Loader component renders with a specific class or text)
    expect(document.querySelector('.loader')).toBeInTheDocument();
  });

  it('displays no content message when content is empty', () => {
    render(
      <MarkdownPageWithSidebar
        content=""
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
        noContentMessage="No content available"
      />
    );

    expect(screen.getByText('No content available')).toBeInTheDocument();
  });

  it('generates correct IDs for H3 anchors', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(() => {
      const subsection = document.getElementById('subsection-11');
      expect(subsection).toBeInTheDocument();
      expect(subsection?.tagName).toBe('H3');
    });
  });

  it('has correct ARIA attributes on sections', async () => {
    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Section 1', level: 2 })).toBeInTheDocument();
    });

    const sectionHeader = screen
      .getAllByRole('button')
      .find(el => el.textContent?.includes('Section 1'));

    expect(sectionHeader).toHaveAttribute('role', 'button');
    expect(sectionHeader).toHaveAttribute('tabIndex', '0');
    expect(sectionHeader).toHaveAttribute('aria-expanded');
    expect(sectionHeader).toHaveAttribute('aria-controls');
  });

  it('handles URL hash navigation on mount', async () => {
    // Set a hash before rendering
    window.location.hash = '#section-1';

    const scrollIntoViewMock = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoViewMock;

    render(
      <MarkdownPageWithSidebar
        content={mockContent}
        title="Test Page"
        breadcrumbLabels={mockBreadcrumbLabels}
      />
    );

    await waitFor(
      () => {
        expect(scrollIntoViewMock).toHaveBeenCalled();
      },
      { timeout: 500 }
    );
  });
});
