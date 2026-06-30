import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import BoardsSidebar from '../BoardsSidebar';

const t = vi.fn((key: string) => key) as unknown as Parameters<typeof BoardsSidebar>[0]['t'];

describe('BoardsSidebar', () => {
  it('renders the table of contents label and one row per group', () => {
    render(
      <BoardsSidebar
        t={t}
        groups={['Editorial Board', 'Scientific Advisory Board']}
        openGroups={new Set([0])}
        onSetActiveGroupCallback={vi.fn()}
        tableOfContentsLabel="Table of contents"
      />
    );

    expect(screen.getByText('Table of contents')).toBeInTheDocument();
    expect(screen.getByText('Editorial Board')).toBeInTheDocument();
    expect(screen.getByText('Scientific Advisory Board')).toBeInTheDocument();
  });

  it('falls back to the translation key when no tableOfContentsLabel is provided', () => {
    render(
      <BoardsSidebar t={t} groups={[]} openGroups={new Set()} onSetActiveGroupCallback={vi.fn()} />
    );

    expect(screen.getByText('pages.boards.tableOfContents')).toBeInTheDocument();
  });

  it('marks only the open group as active', () => {
    const { container } = render(
      <BoardsSidebar
        t={t}
        groups={['Editorial Board', 'Technical Board']}
        openGroups={new Set([1])}
        onSetActiveGroupCallback={vi.fn()}
      />
    );

    const rows = container.querySelectorAll('.boardsSidebar-links-row');
    expect(rows[0]).not.toHaveClass('boardsSidebar-links-row-active');
    expect(rows[1]).toHaveClass('boardsSidebar-links-row-active');
  });

  it('calls onSetActiveGroupCallback with the clicked group index', async () => {
    const user = userEvent.setup();
    const onSetActiveGroupCallback = vi.fn();
    render(
      <BoardsSidebar
        t={t}
        groups={['Editorial Board', 'Technical Board']}
        openGroups={new Set()}
        onSetActiveGroupCallback={onSetActiveGroupCallback}
      />
    );

    await user.click(screen.getByText('Technical Board'));

    expect(onSetActiveGroupCallback).toHaveBeenCalledWith(1);
  });

  it('triggers the callback via the keyboard (Enter and Space)', async () => {
    const user = userEvent.setup();
    const onSetActiveGroupCallback = vi.fn();
    render(
      <BoardsSidebar
        t={t}
        groups={['Editorial Board']}
        openGroups={new Set()}
        onSetActiveGroupCallback={onSetActiveGroupCallback}
      />
    );

    const row = screen.getByText('Editorial Board');
    row.focus();
    await user.keyboard('{Enter}');
    expect(onSetActiveGroupCallback).toHaveBeenCalledWith(0);

    await user.keyboard(' ');
    expect(onSetActiveGroupCallback).toHaveBeenCalledTimes(2);
  });
});
