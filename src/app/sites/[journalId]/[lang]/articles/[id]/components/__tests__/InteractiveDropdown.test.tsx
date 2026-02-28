import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import InteractiveDropdown from '../InteractiveDropdown';

// --- Mocks ---

const mockGetCitations = vi.fn();
const mockFetchArticleMetadata = vi.fn();
const mockToastSuccess = vi.fn();
const mockToastError = vi.fn();

vi.mock('@/utils/article', async () => {
  const actual = await vi.importActual<typeof import('@/utils/article')>('@/utils/article');
  return {
    ...actual,
    getCitations: (...args: any[]) => mockGetCitations(...args),
    copyToClipboardCitation: vi.fn(),
    getMetadataTypes: () => [
      { type: 'bibtex', label: 'BibTeX' },
      { type: 'ris', label: 'RIS' },
    ],
  };
});

vi.mock('@/services/article', () => ({
  fetchArticleMetadata: (...args: any[]) => mockFetchArticleMetadata(...args),
}));

vi.mock('@/utils/toast', () => ({
  toastSuccess: (...args: any[]) => mockToastSuccess(...args),
  toastError: (...args: any[]) => mockToastError(...args),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) =>
    selector({ journalReducer: { currentJournal: { code: 'test-journal' } } }),
}));

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/utils/keyboard', () => ({
  handleKeyboardClick: vi.fn(),
}));

vi.mock('@/components/icons', () => ({
  QuoteBlackIcon: ({ ariaLabel }: any) => <span data-testid="quote-icon" aria-label={ariaLabel} />,
  ShareIcon: ({ ariaLabel }: any) => <span data-testid="share-icon" aria-label={ariaLabel} />,
  BlueskyIcon: () => <span />,
  MailIcon: () => <span />,
  FacebookIcon: () => <span />,
  TwitterIcon: () => <span />,
  LinkedinIcon: () => <span />,
  WhatsappIcon: () => <span />,
}));

vi.mock('react-share', () => ({
  BlueskyShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-bluesky">
      {children}
    </button>
  ),
  EmailShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-email">
      {children}
    </button>
  ),
  FacebookShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-facebook">
      {children}
    </button>
  ),
  LinkedinShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-linkedin">
      {children}
    </button>
  ),
  TwitterShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-twitter">
      {children}
    </button>
  ),
  WhatsappShareButton: ({ children, className }: any) => (
    <button type="button" className={className} data-testid="share-whatsapp">
      {children}
    </button>
  ),
}));

// --- Helpers ---

const DEFAULT_CSL = 'csl-data';
const DEFAULT_BIBTEX = '@article{...}';

/** The trigger button always has aria-haspopup="menu". */
const getTrigger = () =>
  document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;

// --- Tests ---

describe('InteractiveDropdown', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetCitations.mockResolvedValue([
      { key: 'APA', citation: 'Smith, J. (2024).' },
      { key: 'MLA', citation: 'Smith, John. 2024.' },
    ]);
    mockFetchArticleMetadata.mockResolvedValue('@article{test}');
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Conditional rendering
  // ─────────────────────────────────────────────────────────────────────────
  describe('Conditional rendering', () => {
    it('returns null for type=cite when both metadataCSL and metadataBibTeX are absent', () => {
      const { container } = render(<InteractiveDropdown type="cite" />);
      expect(container.firstChild).toBeNull();
    });

    it('renders for type=cite when metadataCSL is provided', () => {
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      expect(getTrigger()).toBeInTheDocument();
    });

    it('renders for type=metadata when metadata types are available', () => {
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      expect(getTrigger()).toBeInTheDocument();
    });

    it('renders for type=share', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA attributes', () => {
    it('trigger button has aria-expanded=false initially', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('trigger button has aria-expanded=true after click (dropdown closed initially)', () => {
      render(<InteractiveDropdown type="share" />);
      // fireEvent.click does not fire mouseenter, so the toggle goes false → true
      fireEvent.click(getTrigger());
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('trigger button has aria-haspopup="menu"', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: cite
  // ─────────────────────────────────────────────────────────────────────────
  describe('type=cite', () => {
    it('shows loading state while generating citations', async () => {
      let resolve: (v: any) => void;
      mockGetCitations.mockReturnValue(new Promise(r => (resolve = r)));

      const user = userEvent.setup();
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());

      expect(screen.getByText(/common.loading/i)).toBeInTheDocument();
      resolve!([]);
    });

    it('shows citation keys after generation', async () => {
      const user = userEvent.setup();
      render(
        <InteractiveDropdown
          type="cite"
          metadataCSL={DEFAULT_CSL}
          metadataBibTeX={DEFAULT_BIBTEX}
        />
      );
      await user.click(getTrigger());

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument();
      });
    });

    it('does not call getCitations a second time when already generated', async () => {
      const user = userEvent.setup();
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());
      await waitFor(() => expect(mockGetCitations).toHaveBeenCalledOnce());
      // Close then reopen
      await user.click(getTrigger());
      await user.click(getTrigger());
      expect(mockGetCitations).toHaveBeenCalledOnce();
    });

    it('filters out citations with empty content', async () => {
      mockGetCitations.mockResolvedValue([
        { key: 'APA', citation: 'Smith, J. (2024).' },
        { key: 'Empty', citation: '   ' },
      ]);
      const user = userEvent.setup();
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument()
      );
      expect(screen.queryByRole('menuitem', { name: 'Empty' })).not.toBeInTheDocument();
    });

    it('shows error toast when getCitations throws', async () => {
      mockGetCitations.mockRejectedValue(new Error('network error'));
      const user = userEvent.setup();
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());
      await waitFor(() => expect(mockToastError).toHaveBeenCalledOnce());
    });

    it('uses QuoteBlackIcon for type=cite', () => {
      render(<InteractiveDropdown type="cite" metadataCSL={DEFAULT_CSL} />);
      expect(screen.getByTestId('quote-icon')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: metadata
  // ─────────────────────────────────────────────────────────────────────────
  describe('type=metadata', () => {
    it('renders all metadata type buttons in the menu', async () => {
      const user = userEvent.setup();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());
      expect(screen.getByRole('menuitem', { name: 'BibTeX' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'RIS' })).toBeInTheDocument();
    });

    it('calls fetchArticleMetadata when a format button is clicked', async () => {
      const user = userEvent.setup();
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());
      await user.click(screen.getByRole('menuitem', { name: 'BibTeX' }));
      await waitFor(() => expect(mockFetchArticleMetadata).toHaveBeenCalledOnce());
      expect(mockFetchArticleMetadata).toHaveBeenCalledWith(
        expect.objectContaining({ rvcode: 'test-journal', paperid: '42', type: 'bibtex' })
      );
    });

    it('shows error toast when fetchArticleMetadata returns null', async () => {
      mockFetchArticleMetadata.mockResolvedValue(null);
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      const user = userEvent.setup();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());
      await user.click(screen.getByRole('menuitem', { name: 'RIS' }));
      await waitFor(() => expect(mockToastError).toHaveBeenCalledOnce());
    });

    it('uses QuoteBlackIcon for type=metadata', () => {
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      expect(screen.getByTestId('quote-icon')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: share
  // ─────────────────────────────────────────────────────────────────────────
  describe('type=share', () => {
    it('renders all social share buttons in the DOM (always mounted)', () => {
      render(<InteractiveDropdown type="share" />);
      // Social buttons are always in the DOM (visibility controlled by CSS class)
      expect(screen.getByTestId('share-bluesky')).toBeInTheDocument();
      expect(screen.getByTestId('share-facebook')).toBeInTheDocument();
      expect(screen.getByTestId('share-linkedin')).toBeInTheDocument();
      expect(screen.getByTestId('share-email')).toBeInTheDocument();
      expect(screen.getByTestId('share-whatsapp')).toBeInTheDocument();
      expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
    });

    it('uses ShareIcon for type=share', () => {
      render(<InteractiveDropdown type="share" />);
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('toggle button opens the dropdown when clicked from closed state', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      // fireEvent.click avoids the mouseenter side-effect that would invert the toggle
      fireEvent.click(getTrigger());
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard navigation
  // ─────────────────────────────────────────────────────────────────────────
  describe('Keyboard navigation', () => {
    it('closes dropdown on Escape key', () => {
      render(<InteractiveDropdown type="share" />);
      // Open via mouseenter (no toggle side-effect)
      fireEvent.mouseEnter(getTrigger().closest('div')!);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      // Escape fires on the button
      fireEvent.keyDown(getTrigger(), { key: 'Escape' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens dropdown on mouse enter and closes on mouse leave', () => {
      render(<InteractiveDropdown type="share" />);
      const container = getTrigger().closest('div')!;
      fireEvent.mouseEnter(container);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      fireEvent.mouseLeave(container);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('ArrowDown on trigger opens the dropdown', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      fireEvent.keyDown(getTrigger(), { key: 'ArrowDown' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowUp on trigger opens the dropdown', () => {
      render(<InteractiveDropdown type="share" />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      fireEvent.keyDown(getTrigger(), { key: 'ArrowUp' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowDown navigates to next menuitem in cite dropdown', async () => {
      const user = userEvent.setup();
      render(
        <InteractiveDropdown
          type="cite"
          metadataCSL={DEFAULT_CSL}
          metadataBibTeX={DEFAULT_BIBTEX}
        />
      );
      await user.click(getTrigger());
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument());

      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);
    });

    it('ArrowUp navigates to previous menuitem in cite dropdown', async () => {
      const user = userEvent.setup();
      render(
        <InteractiveDropdown
          type="cite"
          metadataCSL={DEFAULT_CSL}
          metadataBibTeX={DEFAULT_BIBTEX}
        />
      );
      await user.click(getTrigger());
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument());

      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(items[1], { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowDown wraps from last to first menuitem', async () => {
      const user = userEvent.setup();
      render(
        <InteractiveDropdown
          type="cite"
          metadataCSL={DEFAULT_CSL}
          metadataBibTeX={DEFAULT_BIBTEX}
        />
      );
      await user.click(getTrigger());
      await waitFor(() => expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument());

      const items = screen.getAllByRole('menuitem');
      items[items.length - 1].focus();
      fireEvent.keyDown(items[items.length - 1], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('Home focuses the first menuitem in metadata dropdown', async () => {
      const user = userEvent.setup();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());

      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(items[1], { key: 'Home' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('End focuses the last menuitem in metadata dropdown', async () => {
      const user = userEvent.setup();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());

      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'End' });
      expect(document.activeElement).toBe(items[items.length - 1]);
    });

    it('Escape in menu closes the dropdown and returns focus to trigger', async () => {
      const user = userEvent.setup();
      render(<InteractiveDropdown type="metadata" articleId="42" />);
      await user.click(getTrigger());

      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'Escape' });

      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      expect(document.activeElement).toBe(getTrigger());
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Custom label prop
  // ─────────────────────────────────────────────────────────────────────────
  describe('label prop', () => {
    it('renders the provided label instead of falling back to t()', () => {
      render(<InteractiveDropdown type="share" label="Partager" />);
      expect(screen.getByText('Partager')).toBeInTheDocument();
    });
  });
});
