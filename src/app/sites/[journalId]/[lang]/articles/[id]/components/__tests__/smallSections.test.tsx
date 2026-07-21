import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect } from 'vitest';
import ClassificationsSection from '../ClassificationsSection';
import ReferencesSection from '../ReferencesSection';
import PreviewSection from '../PreviewSection';
import CollapsibleSectionWrapper from '../CollapsibleSectionWrapper';
import SidebarCollapsibleWrapper from '../SidebarCollapsibleWrapper';

describe('ClassificationsSection', () => {
  it('renders a link per classification with code and label', () => {
    render(
      <ClassificationsSection
        classifications={[
          {
            code: '03B10',
            label: 'Classical first-order logic',
            description: '',
            sourceName: 'MSC',
            classificationName: 'MSC2020',
          },
          { code: '03B15', label: '', description: '', sourceName: 'MSC', classificationName: 'MSC2020' },
        ]}
      />
    );

    const link = screen.getByRole('link', { name: /03B10/ });
    expect(link).toHaveAttribute(
      'href',
      'https://zbmath.org/classification/?q=03B10'
    );
    expect(screen.getByText(/Classical first-order logic/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '03B15' })).toBeInTheDocument();
  });

  it('renders nothing when classifications is empty', () => {
    const { container } = render(<ClassificationsSection classifications={[]} />);
    expect(container.querySelector('ul')?.children.length).toBe(0);
  });
});

describe('ReferencesSection', () => {
  it('returns null when there are no references', () => {
    const { container } = render(<ReferencesSection references={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('returns null when references is undefined', () => {
    const { container } = render(<ReferencesSection references={undefined as never} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders citation text and a DOI link when present', () => {
    render(
      <ReferencesSection
        references={[
          { citation: 'Author, Title, 2020', doi: '10.1234/abc' },
          { citation: 'No DOI reference' },
        ]}
      />
    );

    expect(screen.getByText('Author, Title, 2020')).toBeInTheDocument();
    expect(screen.getByText('No DOI reference')).toBeInTheDocument();
    const doiLink = screen.getByRole('link', { name: /10.1234\/abc/ });
    expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/abc');
  });
});

describe('PreviewSection', () => {
  it('returns null when previewHref is empty', () => {
    const { container } = render(<PreviewSection previewHref="" />);
    expect(container).toBeEmptyDOMElement();
  });

  it('renders a PDFProxyIframe when previewHref is provided', () => {
    const { container } = render(<PreviewSection previewHref="https://example.com/doc.pdf" />);
    expect(
      container.querySelector('.articleDetails-content-article-section-content-preview')
    ).toBeInTheDocument();
  });
});

describe('CollapsibleSectionWrapper', () => {
  it('renders children and starts open by default', () => {
    render(
      <CollapsibleSectionWrapper title="My section" sectionKey="sec1">
        <p>Section content</p>
      </CollapsibleSectionWrapper>
    );

    expect(screen.getByText('Section content')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('starts closed when initialOpen is false and toggles on click', async () => {
    const user = userEvent.setup();
    render(
      <CollapsibleSectionWrapper title="My section" sectionKey="sec1" initialOpen={false}>
        <p>Section content</p>
      </CollapsibleSectionWrapper>
    );

    const trigger = screen.getByRole('button');
    expect(trigger).toHaveAttribute('aria-expanded', 'false');

    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
  });
});

describe('SidebarCollapsibleWrapper', () => {
  it('renders children and starts open by default', () => {
    render(
      <SidebarCollapsibleWrapper title="Publication details">
        <p>Detail content</p>
      </SidebarCollapsibleWrapper>
    );

    expect(screen.getByText('Detail content')).toBeInTheDocument();
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('toggles closed on click and swaps the caret icon', async () => {
    const user = userEvent.setup();
    render(
      <SidebarCollapsibleWrapper title="Publication details" className="custom-wrapper">
        <p>Detail content</p>
      </SidebarCollapsibleWrapper>
    );

    const trigger = screen.getByRole('button');
    expect(screen.getByLabelText('Collapse')).toBeInTheDocument();

    await user.click(trigger);

    expect(trigger).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByLabelText('Expand')).toBeInTheDocument();
  });
});
