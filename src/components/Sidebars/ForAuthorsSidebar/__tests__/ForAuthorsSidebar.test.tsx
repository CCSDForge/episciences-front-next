import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ForAuthorsSidebar, { IForAuthorsHeader } from '../ForAuthorsSidebar';

vi.mock('next/navigation', () => ({
  usePathname: () => '/epijinfo/en/for-authors',
}));

const makeHeader = (overrides: Partial<IForAuthorsHeader>): IForAuthorsHeader => ({
  id: 'header',
  value: 'Header',
  opened: true,
  children: [],
  ...overrides,
});

describe('ForAuthorsSidebar', () => {
  beforeEach(() => {
    window.history.pushState(null, '', '/epijinfo/en/for-authors');
  });

  it('renders a link per top-level header pointing at the pathname anchor', () => {
    const headers = [makeHeader({ id: 'submission', value: 'Submission' })];
    render(<ForAuthorsSidebar headers={headers} toggleHeaderCallback={vi.fn()} />);

    const link = screen.getByRole('link', { name: 'Submission' });
    expect(link).toHaveAttribute('href', '/epijinfo/en/for-authors#submission');
  });

  it('does not render a caret when a header has no children', () => {
    const headers = [makeHeader({ id: 'submission', value: 'Submission', children: [] })];
    const { container } = render(
      <ForAuthorsSidebar headers={headers} toggleHeaderCallback={vi.fn()} />
    );

    expect(
      container.querySelector('.forAuthorsSidebar-header-title-caret')
    ).not.toBeInTheDocument();
  });

  it('renders nested sub-header links only while the header is opened', () => {
    const headers = [
      makeHeader({
        id: 'prepare',
        value: 'Prepare your submission',
        opened: true,
        children: [makeHeader({ id: 'format', value: '1. Format your manuscript' })],
      }),
    ];
    render(<ForAuthorsSidebar headers={headers} toggleHeaderCallback={vi.fn()} />);

    expect(screen.getByRole('link', { name: '1. Format your manuscript' })).toBeInTheDocument();
  });

  it('hides nested sub-header links when the header is collapsed', () => {
    const headers = [
      makeHeader({
        id: 'prepare',
        value: 'Prepare your submission',
        opened: false,
        children: [makeHeader({ id: 'format', value: '1. Format your manuscript' })],
      }),
    ];
    render(<ForAuthorsSidebar headers={headers} toggleHeaderCallback={vi.fn()} />);

    expect(
      screen.queryByRole('link', { name: '1. Format your manuscript' })
    ).not.toBeInTheDocument();
    // The top-level header link itself stays visible.
    expect(screen.getByRole('link', { name: 'Prepare your submission' })).toBeInTheDocument();
  });

  it('calls toggleHeaderCallback with the header id when its caret is clicked', async () => {
    const user = userEvent.setup();
    const toggleHeaderCallback = vi.fn();
    const headers = [
      makeHeader({
        id: 'prepare',
        value: 'Prepare your submission',
        opened: true,
        children: [makeHeader({ id: 'format', value: '1. Format your manuscript' })],
      }),
    ];
    const { container } = render(
      <ForAuthorsSidebar headers={headers} toggleHeaderCallback={toggleHeaderCallback} />
    );

    const caret = container.querySelector('.forAuthorsSidebar-header-title-caret') as HTMLElement;
    await user.click(caret);

    expect(toggleHeaderCallback).toHaveBeenCalledWith('prepare');
  });

  it('does not navigate the page when an anchor link is clicked (smooth-scrolls instead)', async () => {
    const user = userEvent.setup();
    const headers = [makeHeader({ id: 'submission', value: 'Submission' })];
    render(<ForAuthorsSidebar headers={headers} toggleHeaderCallback={vi.fn()} />);

    const scrollIntoViewMock = vi.fn();
    const target = document.createElement('div');
    target.id = 'submission';
    target.scrollIntoView = scrollIntoViewMock;
    document.body.appendChild(target);

    await user.click(screen.getByRole('link', { name: 'Submission' }));

    expect(scrollIntoViewMock).toHaveBeenCalledWith({ behavior: 'smooth', block: 'start' });
    expect(window.location.pathname + window.location.hash).toBe(
      '/epijinfo/en/for-authors#submission'
    );

    document.body.removeChild(target);
  });
});
