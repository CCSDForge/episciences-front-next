import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import AuthorsSidebar from '../AuthorsSidebar';

const t = (key: string) => key;

describe('AuthorsSidebar', () => {
  it('renders the search input and all letters plus "others"', () => {
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={vi.fn()}
      />
    );

    expect(screen.getByRole('searchbox')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('Z')).toBeInTheDocument();
    expect(screen.getByText('pages.authors.others')).toBeInTheDocument();
  });

  it('calls onSearchCallback when typing in the search input', () => {
    const onSearchCallback = vi.fn();
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={onSearchCallback}
        activeLetter=""
        onSetActiveLetterCallback={vi.fn()}
      />
    );

    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'Doe' } });
    expect(onSearchCallback).toHaveBeenCalledWith('Doe');
  });

  it('calls onSetActiveLetterCallback when a letter is clicked', () => {
    const onSetActiveLetterCallback = vi.fn();
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={onSetActiveLetterCallback}
      />
    );

    fireEvent.click(screen.getByText('J'));
    expect(onSetActiveLetterCallback).toHaveBeenCalledWith('J');
  });

  it('supports selecting a letter via the keyboard', () => {
    const onSetActiveLetterCallback = vi.fn();
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={onSetActiveLetterCallback}
      />
    );

    fireEvent.keyDown(screen.getByText('K'), { key: 'Enter' });
    expect(onSetActiveLetterCallback).toHaveBeenCalledWith('K');
  });

  it('marks the active letter with the active class', () => {
    const { container } = render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter="J"
        onSetActiveLetterCallback={vi.fn()}
      />
    );

    expect(screen.getByText('J')).toHaveClass('authorsSidebar-letters-letter-active');
    expect(container.querySelectorAll('.authorsSidebar-letters-letter-active')).toHaveLength(1);
  });

  it('marks the "others" entry active when selected', () => {
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter="others"
        onSetActiveLetterCallback={vi.fn()}
      />
    );

    expect(screen.getByText('pages.authors.others')).toHaveClass(
      'authorsSidebar-letters-letter-active'
    );
  });

  it('disables letters absent from lettersRange', () => {
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={vi.fn()}
        lettersRange={{ A: 3, J: 2 }}
      />
    );

    expect(screen.getByText('A')).not.toHaveClass('authorsSidebar-letters-letter-disabled');
    expect(screen.getByText('B')).toHaveClass('authorsSidebar-letters-letter-disabled');
  });

  it('disables "others" when Others is absent from lettersRange', () => {
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={vi.fn()}
        lettersRange={{ A: 3 }}
      />
    );

    expect(screen.getByText('pages.authors.others')).toHaveClass(
      'authorsSidebar-letters-letter-disabled'
    );
  });

  it('does not disable letters when lettersRange is absent', () => {
    render(
      <AuthorsSidebar
        t={t as never}
        search=""
        onSearchCallback={vi.fn()}
        activeLetter=""
        onSetActiveLetterCallback={vi.fn()}
      />
    );

    expect(screen.getByText('A')).not.toHaveClass('authorsSidebar-letters-letter-disabled');
  });
});
