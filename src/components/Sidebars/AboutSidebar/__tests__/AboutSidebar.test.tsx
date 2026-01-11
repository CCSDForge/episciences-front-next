import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import AboutSidebar, { IAboutHeader } from '../AboutSidebar';

describe('AboutSidebar', () => {
  const mockHeaders: IAboutHeader[] = [
    {
      id: 'section-1',
      value: 'Section 1',
      opened: true,
      children: [
        {
          id: 'subsection-1-1',
          value: 'Subsection 1.1',
          opened: false,
          children: [],
        },
        {
          id: 'subsection-1-2',
          value: 'Subsection 1.2',
          opened: false,
          children: [],
        },
      ],
    },
    {
      id: 'section-2',
      value: 'Section 2',
      opened: false,
      children: [
        {
          id: 'subsection-2-1',
          value: 'Subsection 2.1',
          opened: false,
          children: [],
        },
      ],
    },
    {
      id: 'section-3',
      value: 'Section 3',
      opened: true,
      children: [],
    },
  ];

  const mockToggleCallback = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock scrollIntoView
    Element.prototype.scrollIntoView = vi.fn();
    // Mock history.pushState
    window.history.pushState = vi.fn();
  });

  it('renders all headers correctly', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    expect(screen.getByText('Section 1')).toBeInTheDocument();
    expect(screen.getByText('Section 2')).toBeInTheDocument();
    expect(screen.getByText('Section 3')).toBeInTheDocument();
  });

  it('renders as nav element with correct aria-label', () => {
    const { container } = render(
      <AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />
    );

    const nav = container.querySelector('nav');
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveAttribute('aria-label', 'Table of contents');
  });

  it('displays sub-headers when parent is opened', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Section 1 is opened, so its children should be visible
    expect(screen.getByText('Subsection 1.1')).toBeInTheDocument();
    expect(screen.getByText('Subsection 1.2')).toBeInTheDocument();
  });

  it('hides sub-headers when parent is closed', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Section 2 is closed, so its children should not be visible
    expect(screen.queryByText('Subsection 2.1')).not.toBeInTheDocument();
  });

  it('navigates to anchor on link click', async () => {
    // Create a mock element in the DOM
    const mockElement = document.createElement('div');
    mockElement.id = 'section-1';
    document.body.appendChild(mockElement);

    const scrollIntoViewMock = vi.fn();
    mockElement.scrollIntoView = scrollIntoViewMock;

    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    const link = screen.getByText('Section 1').closest('a');
    expect(link).toBeInTheDocument();

    fireEvent.click(link!);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    // Clean up
    document.body.removeChild(mockElement);
  });

  it('updates URL hash on anchor click', async () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'section-1';
    document.body.appendChild(mockElement);

    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    const link = screen.getByText('Section 1').closest('a');
    fireEvent.click(link!);

    await waitFor(() => {
      expect(window.history.pushState).toHaveBeenCalledWith(null, '', '#section-1');
    });

    // Clean up
    document.body.removeChild(mockElement);
  });

  it('prevents default link behavior on anchor click', () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'section-1';
    document.body.appendChild(mockElement);

    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    const link = screen.getByText('Section 1').closest('a');
    const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, 'preventDefault');

    link?.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();

    // Clean up
    document.body.removeChild(mockElement);
  });

  it('toggles header expand/collapse when caret icon is clicked', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Find the caret icon for Section 1 (which has children)
    const caretIcons = screen.getAllByLabelText(/Collapse section|Expand section/);
    const firstCaret = caretIcons[0]; // Section 1 caret

    fireEvent.click(firstCaret);

    expect(mockToggleCallback).toHaveBeenCalledWith('section-1');
  });

  it('displays CaretUp icon when header is opened', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Section 1 is opened, so it should have CaretUp
    const collapseIcon = screen.getByLabelText('Collapse section');
    expect(collapseIcon).toBeInTheDocument();
  });

  it('displays CaretDown icon when header is closed', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Section 2 is closed, so it should have CaretDown
    const expandIcon = screen.getByLabelText('Expand section');
    expect(expandIcon).toBeInTheDocument();
  });

  it('does not display caret icons for headers without children', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Section 3 has no children, so its header area should not have caret icons
    const section3Header = screen.getByText('Section 3').closest('.aboutSidebar-header-title');
    const caretInSection3 = section3Header?.querySelector('[aria-label*="section"]');

    expect(caretInSection3).not.toBeInTheDocument();
  });

  it('renders sub-header links correctly', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    const subheaderLink = screen.getByText('Subsection 1.1').closest('a');
    expect(subheaderLink).toHaveAttribute('href', '#subsection-1-1');
  });

  it('handles navigation to sub-header anchors', async () => {
    const mockElement = document.createElement('div');
    mockElement.id = 'subsection-1-1';
    document.body.appendChild(mockElement);

    const scrollIntoViewMock = vi.fn();
    mockElement.scrollIntoView = scrollIntoViewMock;

    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    const subheaderLink = screen.getByText('Subsection 1.1').closest('a');
    fireEvent.click(subheaderLink!);

    await waitFor(() => {
      expect(scrollIntoViewMock).toHaveBeenCalledWith({
        behavior: 'smooth',
        block: 'start',
      });
    });

    // Clean up
    document.body.removeChild(mockElement);
  });

  it('handles missing target element gracefully', () => {
    render(<AboutSidebar headers={mockHeaders} toggleHeaderCallback={mockToggleCallback} />);

    // Click on a link to a non-existent element
    const link = screen.getByText('Section 1').closest('a');

    // Should not throw error
    expect(() => fireEvent.click(link!)).not.toThrow();
  });
});
