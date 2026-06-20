import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useParams, usePathname } from 'next/navigation';
import Breadcrumb from '../Breadcrumb';

vi.mock('next/navigation', () => ({
  useParams: vi.fn(() => ({})),
  usePathname: vi.fn(() => null),
}));

vi.mock('@/utils/signposting', () => ({
  getJournalBaseUrl: (id: string) => `https://${id}.episciences.org`,
}));

vi.mock('@/utils/language-utils', () => ({
  getLocalizedPath: (path: string, lang: string) => `/${lang}${path}`,
}));

// Mock the Link component
vi.mock('@/components/Link/Link', () => ({
  Link: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock the MathJax component
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

describe('Breadcrumb', () => {
  it('renders breadcrumb navigation with correct aria-label', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Breadcrumb');
  });

  it('renders as an ordered list', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    const ol = container.querySelector('ol');
    expect(ol).toBeInTheDocument();
  });

  it('renders single-level breadcrumb correctly', () => {
    const parents = [{ path: '/', label: 'Home >' }];

    render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    expect(screen.getByText('Home >')).toBeInTheDocument();
    expect(screen.getByText('Current Page')).toBeInTheDocument();
  });

  it('renders multi-level breadcrumb hierarchy', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];

    render(<Breadcrumb parents={parents} crumbLabel="For Authors" />);

    expect(screen.getByText('Home >')).toBeInTheDocument();
    expect(screen.getByText('Publish >')).toBeInTheDocument();
    expect(screen.getByText('For Authors')).toBeInTheDocument();
  });

  it('renders parent links as clickable links', () => {
    const parents = [{ path: '/', label: 'Home >' }];

    render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    const link = screen.getByText('Home >').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/');
  });

  it('renders non-clickable parent when path is #', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];

    render(<Breadcrumb parents={parents} crumbLabel="For Authors" />);

    // The "Publish >" should be rendered as a span, not a link
    const publishElement = screen.getByText('Publish >');
    expect(publishElement.tagName).toBe('SPAN');
    expect(publishElement.closest('a')).not.toBeInTheDocument();
  });

  it('renders current crumb as non-clickable with aria-current', () => {
    const parents = [{ path: '/', label: 'Home >' }];

    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    const currentCrumb = screen.getByText('Current Page').closest('li');
    expect(currentCrumb).toHaveAttribute('aria-current', 'page');
    expect(currentCrumb?.querySelector('a')).not.toBeInTheDocument();
  });

  it('renders three-level hierarchy correctly', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Content >' },
    ];

    render(<Breadcrumb parents={parents} crumbLabel="Articles" />);

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(3); // Home, Content, Articles
  });

  it('passes lang prop to Link components', () => {
    const parents = [{ path: '/', label: 'Home >' }];

    render(<Breadcrumb parents={parents} crumbLabel="Current Page" lang="fr" />);

    // The Link component should receive the lang prop
    // Since we mocked Link, we can't directly test this, but the component should not error
    expect(screen.getByText('Home >')).toBeInTheDocument();
  });

  it('handles empty parents array gracefully', () => {
    render(<Breadcrumb parents={[]} crumbLabel="Orphan Page" />);

    expect(screen.getByText('Orphan Page')).toBeInTheDocument();
    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(1); // Only the current page
  });

  it('renders multiple parent links correctly', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
      { path: '/for-authors', label: 'For Authors >' },
    ];

    render(<Breadcrumb parents={parents} crumbLabel="Ethical Charter" />);

    expect(screen.getByText('Home >')).toBeInTheDocument();
    expect(screen.getByText('Publish >')).toBeInTheDocument();
    expect(screen.getByText('For Authors >')).toBeInTheDocument();
    expect(screen.getByText('Ethical Charter')).toBeInTheDocument();

    const listItems = screen.getAllByRole('listitem');
    expect(listItems).toHaveLength(4);
  });

  it('applies correct CSS classes', () => {
    const parents = [{ path: '/', label: 'Home >' }];

    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Current Page" />);

    expect(container.querySelector('.breadcrumb')).toBeInTheDocument();
    expect(container.querySelector('.breadcrumb-parent')).toBeInTheDocument();
    expect(container.querySelector('.breadcrumb-current')).toBeInTheDocument();
  });

  it('renders list items with correct structure', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];

    const { container } = render(<Breadcrumb parents={parents} crumbLabel="For Authors" />);

    const listItems = container.querySelectorAll('li');
    expect(listItems).toHaveLength(3);

    // First two should have breadcrumb-parent class
    expect(listItems[0]).toHaveClass('breadcrumb-parent');
    expect(listItems[1]).toHaveClass('breadcrumb-parent');

    // Last one should have breadcrumb-current class
    expect(listItems[2]).toHaveClass('breadcrumb-current');
  });

  it('handles special characters in labels', () => {
    const parents = [{ path: '/', label: 'Home & Articles >' }];

    render(<Breadcrumb parents={parents} crumbLabel="Authors & Reviewers" />);

    expect(screen.getByText('Home & Articles >')).toBeInTheDocument();
    expect(screen.getByText('Authors & Reviewers')).toBeInTheDocument();
  });
});

describe('JSON-LD structured data', () => {
  beforeEach(() => {
    vi.mocked(useParams).mockReturnValue({ journalId: 'test-journal' });
    vi.mocked(usePathname).mockReturnValue('/en/volumes');
  });

  const getJsonLd = (container: HTMLElement) => {
    const script = container.querySelector('script[type="application/ld+json"]');
    if (!script) return null;
    return JSON.parse(script.innerHTML);
  };

  it('renders a JSON-LD script when journalId is present', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    expect(container.querySelector('script[type="application/ld+json"]')).toBeInTheDocument();
  });

  it('outputs BreadcrumbList schema type', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    const jsonLd = getJsonLd(container);
    expect(jsonLd['@context']).toBe('https://schema.org');
    expect(jsonLd['@type']).toBe('BreadcrumbList');
  });

  it('assigns sequential 1-based positions to items', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '/volumes', label: 'Volumes >' },
    ];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Vol. 1" />);
    const items = getJsonLd(container).itemListElement;
    expect(items[0].position).toBe(1);
    expect(items[1].position).toBe(2);
    expect(items[2].position).toBe(3);
  });

  it('sets the last item URL from usePathname', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    const items = getJsonLd(container).itemListElement;
    const lastItem = items[items.length - 1];
    expect(lastItem.item).toBe('https://test-journal.episciences.org/en/volumes');
  });

  it('filters out items with path === "#"', () => {
    const parents = [
      { path: '/', label: 'Home >' },
      { path: '#', label: 'Publish >' },
    ];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="For Authors" />);
    const items = getJsonLd(container).itemListElement;
    const names = items.map((i: { name: string }) => i.name);
    expect(names).not.toContain('Publish >');
  });

  it('does not render a JSON-LD script when journalId is absent', () => {
    vi.mocked(useParams).mockReturnValue({});
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    expect(container.querySelector('script[type="application/ld+json"]')).not.toBeInTheDocument();
  });

  it('sets last item item to undefined when pathname is null', () => {
    vi.mocked(usePathname).mockReturnValue(null);
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    const items = getJsonLd(container).itemListElement;
    const lastItem = items[items.length - 1];
    expect(lastItem.item).toBeUndefined();
  });

  it('sets @id on the BreadcrumbList from pathname', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    const jsonLd = getJsonLd(container);
    expect(jsonLd['@id']).toBe('https://test-journal.episciences.org/en/volumes#breadcrumb');
  });

  it('omits @id when pathname is null', () => {
    vi.mocked(usePathname).mockReturnValue(null);
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(<Breadcrumb parents={parents} crumbLabel="Volumes" />);
    const jsonLd = getJsonLd(container);
    expect(jsonLd['@id']).toBeUndefined();
  });

  it('escapes < in the raw script content to prevent </script> injection', () => {
    const parents = [{ path: '/', label: 'Home >' }];
    const { container } = render(
      <Breadcrumb parents={parents} crumbLabel="</script><script>alert(1)</script>" />
    );
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script?.innerHTML).not.toContain('</script>');
    expect(script?.innerHTML).toContain('\\u003c');
  });
});
