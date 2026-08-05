import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CiteDropdown from '../CiteDropdown';
import MetadataDropdown from '../MetadataDropdown';
import ShareDropdown from '../ShareDropdown';
import { SidebarDropdown, useSidebarDropdown } from '../SidebarDropdown/SidebarDropdown';

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
const getTrigger = () => document.querySelector<HTMLButtonElement>('button[aria-haspopup="menu"]')!;

// --- Tests ---

describe('sidebar dropdowns', () => {
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
    it('CiteDropdown returns null when both metadataCSL and metadataBibTeX are absent', () => {
      const { container } = render(<CiteDropdown />);
      expect(container.firstChild).toBeNull();
    });

    it('CiteDropdown renders when metadataCSL is provided', () => {
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
      expect(getTrigger()).toBeInTheDocument();
    });

    it('MetadataDropdown renders when metadata types are available', () => {
      render(<MetadataDropdown articleId="42" />);
      expect(getTrigger()).toBeInTheDocument();
    });

    it('ShareDropdown renders', () => {
      render(<ShareDropdown />);
      expect(getTrigger()).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA attributes', () => {
    it('trigger button has aria-expanded=false initially', () => {
      render(<ShareDropdown />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('trigger button has aria-expanded=true after click (dropdown closed initially)', () => {
      render(<ShareDropdown />);
      // fireEvent.click does not fire mouseenter, so the toggle goes false → true
      fireEvent.click(getTrigger());
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('trigger button has aria-haspopup="menu"', () => {
      render(<ShareDropdown />);
      expect(getTrigger()).toHaveAttribute('aria-haspopup', 'menu');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: cite
  // ─────────────────────────────────────────────────────────────────────────
  describe('CiteDropdown', () => {
    it('shows loading state while generating citations', async () => {
      let resolve: (v: any) => void;
      mockGetCitations.mockReturnValue(new Promise(r => (resolve = r)));

      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());

      expect(screen.getByText(/common.loading/i)).toBeInTheDocument();
      await act(async () => {
        resolve!([]);
      });
    });

    it('shows citation keys after generation', async () => {
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} metadataBibTeX={DEFAULT_BIBTEX} />);
      await user.click(getTrigger());

      await waitFor(() => {
        expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument();
        expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument();
      });
    });

    it('does not call getCitations a second time when already generated', async () => {
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
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
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument()
      );
      expect(screen.queryByRole('menuitem', { name: 'Empty' })).not.toBeInTheDocument();
    });

    it('shows error toast when getCitations throws', async () => {
      mockGetCitations.mockRejectedValue(new Error('network error'));
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
      await user.click(getTrigger());
      await waitFor(() => expect(mockToastError).toHaveBeenCalledOnce());
    });

    it('uses QuoteBlackIcon', () => {
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} />);
      expect(screen.getByTestId('quote-icon')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: metadata
  // ─────────────────────────────────────────────────────────────────────────
  describe('MetadataDropdown', () => {
    it('renders all metadata type buttons in the menu', async () => {
      const user = userEvent.setup();
      render(<MetadataDropdown articleId="42" />);
      await user.click(getTrigger());
      expect(screen.getByRole('menuitem', { name: 'BibTeX' })).toBeInTheDocument();
      expect(screen.getByRole('menuitem', { name: 'RIS' })).toBeInTheDocument();
    });

    it('calls fetchArticleMetadata when a format button is clicked', async () => {
      const user = userEvent.setup();
      global.URL.createObjectURL = vi.fn(() => 'blob:test');
      global.URL.revokeObjectURL = vi.fn();
      render(<MetadataDropdown articleId="42" />);
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
      render(<MetadataDropdown articleId="42" />);
      await user.click(getTrigger());
      await user.click(screen.getByRole('menuitem', { name: 'RIS' }));
      await waitFor(() => expect(mockToastError).toHaveBeenCalledOnce());
    });

    it('uses QuoteBlackIcon', () => {
      render(<MetadataDropdown articleId="42" />);
      expect(screen.getByTestId('quote-icon')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type: share
  // ─────────────────────────────────────────────────────────────────────────
  describe('ShareDropdown', () => {
    it('renders all social share buttons in the DOM (always mounted)', () => {
      render(<ShareDropdown />);
      // Social buttons are always in the DOM (visibility controlled by CSS class)
      expect(screen.getByTestId('share-bluesky')).toBeInTheDocument();
      expect(screen.getByTestId('share-facebook')).toBeInTheDocument();
      expect(screen.getByTestId('share-linkedin')).toBeInTheDocument();
      expect(screen.getByTestId('share-email')).toBeInTheDocument();
      expect(screen.getByTestId('share-whatsapp')).toBeInTheDocument();
      expect(screen.getByTestId('share-twitter')).toBeInTheDocument();
    });

    it('uses ShareIcon', () => {
      render(<ShareDropdown />);
      expect(screen.getByTestId('share-icon')).toBeInTheDocument();
    });

    it('toggle button opens the dropdown when clicked from closed state', () => {
      render(<ShareDropdown />);
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
      render(<ShareDropdown />);
      // Open via mouseenter (no toggle side-effect)
      fireEvent.mouseEnter(getTrigger().closest('div')!);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      // Escape fires on the button
      fireEvent.keyDown(getTrigger(), { key: 'Escape' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('opens dropdown on mouse enter and closes on mouse leave', () => {
      render(<ShareDropdown />);
      const container = getTrigger().closest('div')!;
      fireEvent.mouseEnter(container);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
      fireEvent.mouseLeave(container);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
    });

    it('ArrowDown on trigger opens the dropdown', () => {
      render(<ShareDropdown />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      fireEvent.keyDown(getTrigger(), { key: 'ArrowDown' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowUp on trigger opens the dropdown', () => {
      render(<ShareDropdown />);
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'false');
      fireEvent.keyDown(getTrigger(), { key: 'ArrowUp' });
      expect(getTrigger()).toHaveAttribute('aria-expanded', 'true');
    });

    it('ArrowDown navigates to next menuitem in cite dropdown', async () => {
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} metadataBibTeX={DEFAULT_BIBTEX} />);
      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'APA' })).toBeInTheDocument()
      );

      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[1]);
    });

    it('ArrowUp navigates to previous menuitem in cite dropdown', async () => {
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} metadataBibTeX={DEFAULT_BIBTEX} />);
      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument()
      );

      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(items[1], { key: 'ArrowUp' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('ArrowDown wraps from last to first menuitem', async () => {
      const user = userEvent.setup();
      render(<CiteDropdown metadataCSL={DEFAULT_CSL} metadataBibTeX={DEFAULT_BIBTEX} />);
      await user.click(getTrigger());
      await waitFor(() =>
        expect(screen.getByRole('menuitem', { name: 'MLA' })).toBeInTheDocument()
      );

      const items = screen.getAllByRole('menuitem');
      items[items.length - 1].focus();
      fireEvent.keyDown(items[items.length - 1], { key: 'ArrowDown' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('Home focuses the first menuitem in metadata dropdown', async () => {
      const user = userEvent.setup();
      render(<MetadataDropdown articleId="42" />);
      await user.click(getTrigger());

      const items = screen.getAllByRole('menuitem');
      items[1].focus();
      fireEvent.keyDown(items[1], { key: 'Home' });
      expect(document.activeElement).toBe(items[0]);
    });

    it('End focuses the last menuitem in metadata dropdown', async () => {
      const user = userEvent.setup();
      render(<MetadataDropdown articleId="42" />);
      await user.click(getTrigger());

      const items = screen.getAllByRole('menuitem');
      items[0].focus();
      fireEvent.keyDown(items[0], { key: 'End' });
      expect(document.activeElement).toBe(items[items.length - 1]);
    });

    it('Escape in menu closes the dropdown and returns focus to trigger', async () => {
      const user = userEvent.setup();
      render(<MetadataDropdown articleId="42" />);
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
      render(<ShareDropdown label="Partager" />);
      expect(screen.getByText('Partager')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Shared shell contract
  // ─────────────────────────────────────────────────────────────────────────
  describe('SidebarDropdown contract', () => {
    it('throws when a piece is rendered outside its provider', () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});

      expect(() =>
        render(
          <SidebarDropdown.Frame>
            <SidebarDropdown.Trigger icon={null} label="Orphan" />
          </SidebarDropdown.Frame>
        )
      ).toThrow(/inside <SidebarDropdown.Provider>/);

      consoleError.mockRestore();
    });

    it('exposes state, actions and meta to components rendered inside the provider', () => {
      function StateProbe() {
        const { state, actions, meta } = useSidebarDropdown();
        return (
          <button type="button" data-open={state.isOpen} onClick={actions.open}>
            {meta.frameRef ? 'has-refs' : 'no-refs'}
          </button>
        );
      }

      render(
        <SidebarDropdown.Provider>
          <StateProbe />
        </SidebarDropdown.Provider>
      );

      const probe = screen.getByRole('button', { name: 'has-refs' });
      expect(probe).toHaveAttribute('data-open', 'false');

      fireEvent.click(probe);
      expect(probe).toHaveAttribute('data-open', 'true');
    });
  });
});
