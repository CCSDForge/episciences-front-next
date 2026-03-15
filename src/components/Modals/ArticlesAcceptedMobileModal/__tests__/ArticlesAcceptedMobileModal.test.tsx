import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import ArticlesAcceptedMobileModal from '../ArticlesAcceptedMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';

// --- Mocks ---

vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ onClick, ariaLabel }: any) => (
    <button data-testid="close-icon" onClick={onClick} aria-label={ariaLabel}>
      ×
    </button>
  ),
  CaretUpGreyIcon: ({ onClick }: any) => (
    <span data-testid="caret-up" onClick={onClick} role="img" />
  ),
  CaretDownGreyIcon: ({ onClick }: any) => (
    <span data-testid="caret-down" onClick={onClick} role="img" />
  ),
}));

vi.mock('@/components/Button/Button', () => ({
  default: ({ text, onClickCallback }: { text: string; onClickCallback: () => void }) => (
    <button onClick={onClickCallback}>{text}</button>
  ),
}));

vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({
    checked,
    onChangeCallback,
    ariaLabel,
  }: {
    checked: boolean;
    onChangeCallback: () => void;
    ariaLabel?: string;
  }) => (
    <input type="checkbox" checked={checked} onChange={onChangeCallback} aria-label={ariaLabel} />
  ),
}));

vi.mock('@/components/Tag/Tag', () => ({
  default: ({
    text,
    onCloseCallback,
  }: {
    text: string;
    onCloseCallback: () => void;
  }) => (
    <div data-testid="tag">
      <span>{text}</span>
      <button onClick={onCloseCallback} aria-label={`Remove ${text} filter`}>
        ×
      </button>
    </div>
  ),
}));

vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="focus-trap">{children}</div>
  ),
}));

// --- Store factory ---

const createMockStore = (footerEnabled = false) =>
  configureStore({
    reducer: { footerReducer },
    preloadedState: { footerReducer: { enabled: footerEnabled } },
  });

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.filters.filter': 'Filters',
    'common.filters.documentTypes': 'Document Types',
    'common.filters.applyFilters': 'Apply Filters',
    'common.filters.clearAll': 'Clear All',
    'pages.articles.types.article': 'Article',
    'pages.articles.types.book': 'Book',
    'pages.articles.types.report': 'Report',
  };
  return translations[key] ?? key;
});

const defaultTypes = [
  { labelPath: 'pages.articles.types.article', value: 'article', isChecked: false },
  { labelPath: 'pages.articles.types.book', value: 'book', isChecked: false },
  { labelPath: 'pages.articles.types.report', value: 'report', isChecked: false },
];

const defaultProps = {
  t: mockT,
  initialTypes: defaultTypes,
  onUpdateTypesCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement, footerEnabled = false) => {
  const store = createMockStore(footerEnabled);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('ArticlesAcceptedMobileModal', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title element', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent('Filters');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Trap
  // ─────────────────────────────────────────────────────────────────────────
  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type section — closed by default
  // ─────────────────────────────────────────────────────────────────────────
  describe('Type section', () => {
    it('renders the document types section title', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getByText('Document Types')).toBeInTheDocument();
    });

    it('shows caret-down when type section is closed (default)', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });

    it('renders a checkbox for each type', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(defaultTypes.length);
    });

    it('renders translated type labels', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.getAllByText('Article')).not.toHaveLength(0);
      expect(screen.getAllByText('Book')).not.toHaveLength(0);
    });

    it('all checkboxes start unchecked', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      screen.getAllByRole('checkbox').forEach(cb => expect(cb).not.toBeChecked());
    });

    it('toggles checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      const cb = screen.getByRole('checkbox', { name: 'Article' });
      await user.click(cb);
      expect(cb).toBeChecked();
    });

    it('opens type section when title is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Document Types' }));
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tags
  // ─────────────────────────────────────────────────────────────────────────
  describe('Tags', () => {
    it('shows no tags initially (no filter checked)', () => {
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('shows a tag when a type is checked', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      expect(screen.getByTestId('tag')).toBeInTheDocument();
      expect(screen.getByTestId('tag')).toHaveTextContent('Article');
    });

    it('removes the tag when tag close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      expect(screen.getByTestId('tag')).toBeInTheDocument();
      await user.click(screen.getByRole('button', { name: 'Remove Article filter' }));
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('shows Clear All button when tags are present', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Book' }));
      expect(screen.getByText('Clear All')).toBeInTheDocument();
    });

    it('clears all tags when Clear All is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<ArticlesAcceptedMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('checkbox', { name: 'Book' }));
      expect(screen.getAllByTestId('tag')).toHaveLength(2);
      await user.click(screen.getByRole('button', { name: 'Clear All' }));
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Apply Filters
  // ─────────────────────────────────────────────────────────────────────────
  describe('Apply Filters', () => {
    it('calls onUpdateTypesCallback with the current types on apply', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderWithStore(
        <ArticlesAcceptedMobileModal {...defaultProps} onUpdateTypesCallback={onUpdate} />
      );
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdate).toHaveBeenCalledOnce();
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: 'article', isChecked: true })])
      );
    });

    it('calls onCloseCallback when apply is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(
        <ArticlesAcceptedMobileModal {...defaultProps} onCloseCallback={onClose} />
      );
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Close
  // ─────────────────────────────────────────────────────────────────────────
  describe('Close', () => {
    it('calls onCloseCallback when close icon is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(
        <ArticlesAcceptedMobileModal {...defaultProps} onCloseCallback={onClose} />
      );
      await user.click(screen.getByTestId('close-icon'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(
        <ArticlesAcceptedMobileModal {...defaultProps} onCloseCallback={onClose} />
      );
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when clicking inside the modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(
        <ArticlesAcceptedMobileModal {...defaultProps} onCloseCallback={onClose} />
      );
      await user.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Footer Redux side-effect
  // ─────────────────────────────────────────────────────────────────────────
  describe('Footer dispatch', () => {
    it('dispatches setFooterVisibility(false) on mount when footer is enabled', () => {
      const store = createMockStore(true);
      render(
        <Provider store={store}>
          <ArticlesAcceptedMobileModal {...defaultProps} />
        </Provider>
      );
      expect(store.getState().footerReducer.enabled).toBe(false);
    });

    it('dispatches setFooterVisibility(true) when apply is clicked', async () => {
      const user = userEvent.setup();
      const store = createMockStore(false);
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      render(
        <Provider store={store}>
          <ArticlesAcceptedMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });

    it('dispatches setFooterVisibility(true) when close icon is clicked', async () => {
      const user = userEvent.setup();
      const store = createMockStore(false);
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      render(
        <Provider store={store}>
          <ArticlesAcceptedMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByTestId('close-icon'));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
