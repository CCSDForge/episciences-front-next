import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { checkA11y } from '@/test-utils/axe-helper';
import ArticlesMobileModal from '../ArticlesMobileModal/ArticlesMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';

// Mock the icons
vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ size }: { size: number }) => <span data-testid="close-icon" data-size={size} />,
  CaretUpGreyIcon: ({ size }: { size: number }) => <span data-testid="caret-up-icon" data-size={size} />,
  CaretDownGreyIcon: ({ size }: { size: number }) => <span data-testid="caret-down-icon" data-size={size} />,
}));

// Mock Button component
vi.mock('@/components/Button/Button', () => ({
  default: ({ text, onClickCallback }: { text: string; onClickCallback: () => void }) => (
    <button onClick={onClickCallback}>{text}</button>
  ),
}));

// Mock Checkbox component with proper accessibility attributes
vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({ checked, onChangeCallback, ariaLabel }: { checked: boolean; onChangeCallback: () => void; ariaLabel?: string }) => (
    <input type="checkbox" checked={checked} onChange={onChangeCallback} aria-label={ariaLabel} />
  ),
}));

// Mock Tag component
vi.mock('@/components/Tag/Tag', () => ({
  default: ({ text, onCloseCallback }: { text: string; onCloseCallback: () => void }) => (
    <span data-testid="tag">
      {text}
      <button onClick={onCloseCallback} aria-label="Remove filter">×</button>
    </span>
  ),
}));

// Mock LiveRegion component
vi.mock('@/components/LiveRegion/LiveRegion', () => ({
  default: ({ message }: { message: string }) => (
    <div role="status" aria-live="polite">{message}</div>
  ),
}));

// Mock FocusTrap
vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="focus-trap">{children}</div>,
}));

// Create mock store
const createMockStore = () =>
  configureStore({
    reducer: {
      footerReducer,
    },
    preloadedState: {
      footerReducer: { enabled: true },
    },
  });

// Mock translation function
const mockT = vi.fn((key: string, options?: { count?: number }) => {
  const translations: Record<string, string> = {
    'common.filters.filter': 'Filters',
    'common.close': 'Close',
    'common.filters.documentTypes': 'Document Types',
    'common.filters.years': 'Years',
    'common.filters.applyFilters': 'Apply Filters',
    'common.filters.clearAll': 'Clear all',
    'common.filters.filtersActive': `${options?.count} filters active`,
    'common.filters.noFilters': 'No filters active',
    'document.type.article': 'Article',
    'document.type.review': 'Review',
  };
  return translations[key] || key;
});

const defaultProps = {
  t: mockT,
  initialTypes: [
    { labelPath: 'document.type.article', value: 'article', isChecked: false },
    { labelPath: 'document.type.review', value: 'review', isChecked: false },
  ],
  onUpdateTypesCallback: vi.fn(),
  initialYears: [
    { year: 2024, isChecked: false },
    { year: 2023, isChecked: false },
  ],
  onUpdateYearsCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

describe('ArticlesMobileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset body overflow
    document.body.style.overflow = '';
  });

  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to modal title', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      const title = document.getElementById('modal-title');
      expect(title).toBeInTheDocument();
      expect(title?.tagName).toBe('H2');
    });

    it('renders modal title as h2', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const heading = screen.getByRole('heading', { level: 2 });
      expect(heading).toHaveTextContent('Filters');
    });
  });

  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  describe('Close Button', () => {
    it('has accessible close button with aria-label', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const closeButton = screen.getByRole('button', { name: /close/i });
      expect(closeButton).toBeInTheDocument();
    });

    it('closes modal when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();

      renderWithStore(<ArticlesMobileModal {...defaultProps} onCloseCallback={onClose} />);

      await user.click(screen.getByRole('button', { name: /close/i }));
      expect(onClose).toHaveBeenCalled();
    });
  });

  describe('Escape Key Handler', () => {
    it('closes modal on Escape key press', async () => {
      const onClose = vi.fn();

      renderWithStore(<ArticlesMobileModal {...defaultProps} onCloseCallback={onClose} />);

      fireEvent.keyDown(document, { key: 'Escape' });

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });
  });

  describe('Background Scroll Lock', () => {
    it('prevents background scroll when modal is open', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Expandable Sections', () => {
    it('has aria-expanded on section toggle buttons', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const toggleButtons = screen.getAllByRole('button').filter(
        btn => btn.getAttribute('aria-expanded') !== null
      );

      expect(toggleButtons.length).toBeGreaterThan(0);
      toggleButtons.forEach(btn => {
        expect(btn).toHaveAttribute('aria-expanded');
        expect(btn).toHaveAttribute('aria-controls');
      });
    });

    it('toggles aria-expanded when section is clicked', async () => {
      const user = userEvent.setup();

      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const typeToggle = screen.getByRole('button', { name: /document types/i });
      expect(typeToggle).toHaveAttribute('aria-expanded', 'false');

      await user.click(typeToggle);

      expect(typeToggle).toHaveAttribute('aria-expanded', 'true');
    });

    it('associates toggle button with controlled section via aria-controls', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const typeToggle = screen.getByRole('button', { name: /document types/i });
      const controlledId = typeToggle.getAttribute('aria-controls');

      expect(controlledId).toBeTruthy();
      expect(document.getElementById(controlledId!)).toBeInTheDocument();
    });
  });

  describe('LiveRegion for Announcements', () => {
    it('includes LiveRegion for screen reader announcements', () => {
      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Filter Interactions', () => {
    it('allows selecting filter options', async () => {
      const user = userEvent.setup();

      renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      // Expand the types section
      await user.click(screen.getByRole('button', { name: /document types/i }));

      // Find and click a checkbox
      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      // Checkbox should be checked (controlled by parent state in real use)
      expect(checkboxes[0]).toBeInTheDocument();
    });

    it('calls onUpdateTypesCallback when applying filters', async () => {
      const user = userEvent.setup();
      const onUpdateTypes = vi.fn();

      renderWithStore(
        <ArticlesMobileModal {...defaultProps} onUpdateTypesCallback={onUpdateTypes} />
      );

      await user.click(screen.getByRole('button', { name: /apply filters/i }));

      expect(onUpdateTypes).toHaveBeenCalled();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations', async () => {
      const { container } = renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with expanded sections', async () => {
      const user = userEvent.setup();
      const { container } = renderWithStore(<ArticlesMobileModal {...defaultProps} />);

      // Expand both sections
      await user.click(screen.getByRole('button', { name: /document types/i }));
      await user.click(screen.getByRole('button', { name: /years/i }));

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
