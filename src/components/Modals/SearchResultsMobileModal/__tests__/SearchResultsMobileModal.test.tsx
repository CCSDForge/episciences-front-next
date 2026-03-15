import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import SearchResultsMobileModal from '../SearchResultsMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';

// --- Mocks ---

vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ size }: any) => <span data-testid="close-icon" data-size={size} />,
  CaretUpGreyIcon: ({ size }: any) => <span data-testid="caret-up" data-size={size} />,
  CaretDownGreyIcon: ({ size }: any) => <span data-testid="caret-down" data-size={size} />,
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
  default: ({ text, onCloseCallback }: { text: string; onCloseCallback: () => void }) => (
    <span data-testid="tag">
      {text}
      <button onClick={onCloseCallback} aria-label={`Remove ${text}`}>
        ×
      </button>
    </span>
  ),
}));

vi.mock('@/components/LiveRegion/LiveRegion', () => ({
  default: ({ message }: { message: string }) => (
    <div role="status" aria-live="polite">
      {message}
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

const mockT = vi.fn((key: string, options?: { count?: number }) => {
  const translations: Record<string, string> = {
    'common.filters.filter': 'Filters',
    'common.close': 'Close',
    'common.filters.documentTypes': 'Document Types',
    'common.filters.years': 'Years',
    'common.filters.volumes': 'Volumes',
    'common.filters.sections': 'Sections',
    'common.filters.authors': 'Authors',
    'common.filters.applyFilters': 'Apply Filters',
    'common.filters.clearAll': 'Clear all',
    'common.filters.filtersActive': `${options?.count} filters active`,
    'common.filters.noFilters': 'No filters active',
    'document.type.article': 'Article',
    'document.type.review': 'Review',
  };
  return translations[key] ?? key;
});

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  initialTypes: [
    { labelPath: 'document.type.article', value: 'article', count: 10, isChecked: false },
    { labelPath: 'document.type.review', value: 'review', count: 5, isChecked: false },
  ],
  onUpdateTypesCallback: vi.fn(),
  initialYears: [
    { year: 2024, count: 15, isChecked: false },
    { year: 2023, count: 8, isChecked: false },
  ],
  onUpdateYearsCallback: vi.fn(),
  initialVolumes: [
    { id: 1, label: { en: 'Volume 1', fr: 'Volume 1' }, isChecked: false },
  ],
  onUpdateVolumesCallback: vi.fn(),
  initialSections: [
    { id: 10, label: { en: 'Section A', fr: 'Section A' }, isChecked: false },
  ],
  onUpdateSectionsCallback: vi.fn(),
  initialAuthors: [
    { fullname: 'Alice Dupont', count: 3, isChecked: false },
  ],
  onUpdateAuthorsCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement, footerEnabled = false) => {
  const store = createMockStore(footerEnabled);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('SearchResultsMobileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to h2 modal-title', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      const title = document.getElementById('modal-title');
      expect(title).toBeInTheDocument();
      expect(title?.tagName).toBe('H2');
    });

    it('renders modal title as h2', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Filters');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Trap
  // ─────────────────────────────────────────────────────────────────────────
  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Close button
  // ─────────────────────────────────────────────────────────────────────────
  describe('Close button', () => {
    it('has accessible close button with aria-label', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('calls onCloseCallback when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Keyboard navigation
  // ─────────────────────────────────────────────────────────────────────────
  describe('Keyboard navigation', () => {
    it('calls onCloseCallback when Escape is pressed', () => {
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close on other key presses', () => {
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Click outside
  // ─────────────────────────────────────────────────────────────────────────
  describe('Click outside', () => {
    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when clicking inside the modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Background scroll lock
  // ─────────────────────────────────────────────────────────────────────────
  describe('Background scroll lock', () => {
    it('sets body overflow to hidden on mount', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores body overflow on unmount', () => {
      const { unmount } = renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      unmount();
      expect(document.body.style.overflow).toBe('');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Filter sections — toggle open/close
  // ─────────────────────────────────────────────────────────────────────────
  describe('Filter sections', () => {
    it('all sections start closed (aria-expanded=false)', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const toggleButtons = screen.getAllByRole('button', {
        name: /Document Types|Years|Volumes|Sections|Authors/,
      });
      toggleButtons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-expanded', 'false');
      });
    });

    it('opens Document Types section when its button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const typesButton = screen.getByRole('button', { name: /Document Types/ });
      await user.click(typesButton);
      expect(typesButton).toHaveAttribute('aria-expanded', 'true');
    });

    it('collapses section when its button is clicked again', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const yearsButton = screen.getByRole('button', { name: /Years/ });
      await user.click(yearsButton);
      await user.click(yearsButton);
      expect(yearsButton).toHaveAttribute('aria-expanded', 'false');
    });

    it('each section has aria-controls pointing to its panel', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Document Types/ })).toHaveAttribute(
        'aria-controls',
        'filter-section-types'
      );
      expect(screen.getByRole('button', { name: /Years/ })).toHaveAttribute(
        'aria-controls',
        'filter-section-years'
      );
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type filter checkboxes
  // ─────────────────────────────────────────────────────────────────────────
  describe('Type filter checkboxes', () => {
    it('renders checkboxes for each type', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: 'Article' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Review' })).toBeInTheDocument();
    });

    it('checkboxes start unchecked', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: 'Article' })).not.toBeChecked();
    });

    it('toggles checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const articleCb = screen.getByRole('checkbox', { name: 'Article' });
      await user.click(articleCb);
      expect(articleCb).toBeChecked();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Year filter checkboxes
  // ─────────────────────────────────────────────────────────────────────────
  describe('Year filter checkboxes', () => {
    it('renders checkboxes for each year', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: '2024' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: '2023' })).toBeInTheDocument();
    });

    it('toggles year checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      const cb2024 = screen.getByRole('checkbox', { name: '2024' });
      await user.click(cb2024);
      expect(cb2024).toBeChecked();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tags — created from checked filters
  // ─────────────────────────────────────────────────────────────────────────
  describe('Tags', () => {
    it('shows no tags when no filters are checked', () => {
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('shows a tag when a type filter is checked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await waitFor(() => {
        expect(screen.getByTestId('tag')).toBeInTheDocument();
        expect(screen.getByTestId('tag')).toHaveTextContent('Article');
      });
    });

    it('shows a tag when a year filter is checked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await waitFor(() => {
        expect(screen.getByTestId('tag')).toHaveTextContent('2024');
      });
    });

    it('shows "Clear all" button when tags are present', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Clear all' })).toBeInTheDocument();
      });
    });

    it('removes tag when its close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await waitFor(() => expect(screen.getByTestId('tag')).toBeInTheDocument());
      await user.click(screen.getByRole('button', { name: 'Remove 2024' }));
      await waitFor(() => {
        expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
      });
    });

    it('clicking "Clear all" removes all tags', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await waitFor(() => expect(screen.getAllByTestId('tag')).toHaveLength(2));
      await user.click(screen.getByRole('button', { name: 'Clear all' }));
      await waitFor(() => {
        expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
      });
    });

    it('shows pre-checked filters as tags on initial render', async () => {
      renderWithStore(
        <SearchResultsMobileModal
          {...defaultProps}
          initialYears={[
            { year: 2024, count: 15, isChecked: true },
            { year: 2023, count: 8, isChecked: false },
          ]}
        />
      );
      await waitFor(() => {
        expect(screen.getByTestId('tag')).toHaveTextContent('2024');
      });
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Apply Filters
  // ─────────────────────────────────────────────────────────────────────────
  describe('Apply Filters', () => {
    it('calls all 5 update callbacks when apply is clicked', async () => {
      const user = userEvent.setup();
      const callbacks = {
        onUpdateTypesCallback: vi.fn(),
        onUpdateYearsCallback: vi.fn(),
        onUpdateVolumesCallback: vi.fn(),
        onUpdateSectionsCallback: vi.fn(),
        onUpdateAuthorsCallback: vi.fn(),
        onCloseCallback: vi.fn(),
      };
      renderWithStore(<SearchResultsMobileModal {...defaultProps} {...callbacks} />);
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(callbacks.onUpdateTypesCallback).toHaveBeenCalledOnce();
      expect(callbacks.onUpdateYearsCallback).toHaveBeenCalledOnce();
      expect(callbacks.onUpdateVolumesCallback).toHaveBeenCalledOnce();
      expect(callbacks.onUpdateSectionsCallback).toHaveBeenCalledOnce();
      expect(callbacks.onUpdateAuthorsCallback).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when apply is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('passes checked types to onUpdateTypesCallback', async () => {
      const user = userEvent.setup();
      const onUpdateTypes = vi.fn();
      renderWithStore(
        <SearchResultsMobileModal {...defaultProps} onUpdateTypesCallback={onUpdateTypes} />
      );
      await user.click(screen.getByRole('checkbox', { name: 'Article' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdateTypes).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: 'article', isChecked: true })])
      );
    });

    it('announces filter count to screen readers after apply', async () => {
      const user = userEvent.setup();
      renderWithStore(<SearchResultsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await waitFor(() => expect(screen.getAllByTestId('tag')).toHaveLength(1));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      await waitFor(() => {
        expect(screen.getByRole('status')).toHaveTextContent('1 filters active');
      });
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
          <SearchResultsMobileModal {...defaultProps} />
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
          <SearchResultsMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      // The "footer re-disable" useEffect fires after setFooterVisibility(true),
      // so we verify the dispatch was called rather than checking the final store state.
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
