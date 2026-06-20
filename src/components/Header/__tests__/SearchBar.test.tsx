import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import SearchBar from '../SearchBar';

// --- Mocks ---

const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mockPush }),
}));

const mockChangeLanguage = vi.fn().mockResolvedValue(undefined);
const mockI18n = { language: 'en', changeLanguage: mockChangeLanguage };

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.header.search.placeholder': 'Search...',
        'components.header.search.searchButton': 'Search',
        'components.header.search.submitButton': 'Submit',
        'components.header.search.closeLabel': 'Close search',
        'components.header.search.backAlt': 'Back',
        'components.header.search.iconAlt': 'Search icon',
        'components.header.search.clearLabel': 'Clear search',
        'components.header.search.clearAlt': 'Clear',
      };
      return translations[key] ?? key;
    },
    i18n: mockI18n,
  }),
}));

vi.mock('@/components/icons', () => ({
  SearchIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="search-icon" aria-label={ariaLabel} />
  ),
  ExternalLinkWhiteIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="external-link-icon" aria-label={ariaLabel} />
  ),
  CaretLeftGreyIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="caret-left-icon" aria-label={ariaLabel} />
  ),
  CloseBlackIcon: ({ ariaLabel }: { ariaLabel?: string }) => (
    <span data-testid="close-icon" aria-label={ariaLabel} />
  ),
}));

// --- Tests ---

describe('SearchBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockI18n.language = 'en';
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Initial render (SSR skeleton)
  // ─────────────────────────────────────────────────────────────────────────
  describe('initial render', () => {
    it('renders the search icon', async () => {
      render(<SearchBar lang="en" />);
      // Wait for client hydration
      await waitFor(() => {
        expect(screen.getByRole('textbox')).toBeInTheDocument();
      });
    });

    it('shows disabled Submit button when no manager URL', async () => {
      render(<SearchBar lang="en" />);
      await waitFor(() => {
        const submitBtn = screen.getByRole('button', { name: /Submit/i });
        expect(submitBtn).toBeDisabled();
      });
    });

    it('shows manager link when episciencesManagerUrl provided', async () => {
      render(<SearchBar lang="en" episciencesManagerUrl="https://manager.example.com" />);
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Submit/i });
        expect(link).toHaveAttribute('href', 'https://manager.example.com');
      });
    });

    it('appends journalCode to manager URL', async () => {
      render(
        <SearchBar
          lang="en"
          episciencesManagerUrl="https://manager.example.com"
          journalCode="testjournal"
        />
      );
      await waitFor(() => {
        const link = screen.getByRole('link', { name: /Submit/i });
        expect(link).toHaveAttribute('href', 'https://manager.example.com/testjournal');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus behaviour
  // ─────────────────────────────────────────────────────────────────────────
  describe('focus behaviour', () => {
    it('shows back button when input is focused', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));

      expect(screen.getByLabelText('Close search')).toBeInTheDocument();
    });

    it('shows Search submit button when focused', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));

      expect(screen.getByRole('button', { name: /^Search$/i })).toBeInTheDocument();
    });

    it('shows clear button when focused and value entered', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'quantum');

      expect(screen.getByLabelText('Clear search')).toBeInTheDocument();
    });

    it('does not show clear button when value is empty', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));

      expect(screen.queryByLabelText('Clear search')).not.toBeInTheDocument();
    });

    it('close/back button clears the search value', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'quantum');
      await user.click(screen.getByLabelText('Close search'));

      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Clear button
  // ─────────────────────────────────────────────────────────────────────────
  describe('clear button', () => {
    it('clears the search input value', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'quantum');
      await user.click(screen.getByLabelText('Clear search'));

      expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Form submission
  // ─────────────────────────────────────────────────────────────────────────
  describe('form submission', () => {
    it('navigates to search page on submit', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'quantum computing');
      await user.click(screen.getByRole('button', { name: /^Search$/i }));

      expect(mockPush).toHaveBeenCalledWith('/search?terms=quantum%20computing');
    });

    it('does not navigate when search value is empty', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));

      const form = screen.getByRole('textbox').closest('form')!;
      fireEvent.submit(form);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('does not navigate when value is only whitespace', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), '   ');

      const form = screen.getByRole('textbox').closest('form')!;
      fireEvent.submit(form);

      expect(mockPush).not.toHaveBeenCalled();
    });

    it('encodes special characters in the search term', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      await user.type(screen.getByRole('textbox'), 'A & B');

      const form = screen.getByRole('textbox').closest('form')!;
      fireEvent.submit(form);

      expect(mockPush).toHaveBeenCalledWith('/search?terms=A%20%26%20B');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Click outside
  // ─────────────────────────────────────────────────────────────────────────
  describe('click outside', () => {
    it('closes the focused state when clicking outside', async () => {
      const user = userEvent.setup();
      render(<SearchBar lang="en" />);

      await waitFor(() => screen.getByRole('textbox'));
      await user.click(screen.getByRole('textbox'));
      // Back button is visible when focused
      expect(screen.getByLabelText('Close search')).toBeInTheDocument();

      fireEvent.mouseDown(document.body);

      await waitFor(() => {
        expect(screen.queryByLabelText('Close search')).not.toBeInTheDocument();
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Accessibility
  // ─────────────────────────────────────────────────────────────────────────
  describe('accessibility', () => {
    it('input has aria-label', async () => {
      render(<SearchBar lang="en" />);

      await waitFor(() => {
        const input = screen.getByRole('textbox');
        expect(input).toHaveAttribute('aria-label');
      });
    });
  });
});
