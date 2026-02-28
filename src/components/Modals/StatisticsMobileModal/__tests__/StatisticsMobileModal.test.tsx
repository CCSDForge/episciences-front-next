import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import StatisticsMobileModal from '../StatisticsMobileModal';
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

vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="focus-trap">{children}</div>
  ),
}));

// --- Store factory ---

const createMockStore = () =>
  configureStore({
    reducer: { footerReducer },
    preloadedState: { footerReducer: { enabled: false } },
  });

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.filters.filter': 'Filters',
    'common.filters.years': 'Years',
    'common.filters.applyFilters': 'Apply Filters',
  };
  return translations[key] ?? key;
});

const defaultYears = [
  { year: 2024, isChecked: false },
  { year: 2023, isChecked: false },
  { year: 2022, isChecked: false },
];

const defaultProps = {
  t: mockT,
  years: defaultYears,
  onUpdateYearsCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement) => {
  const store = createMockStore();
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('StatisticsMobileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('shows filter title text', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Trap
  // ─────────────────────────────────────────────────────────────────────────
  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Year section — default open
  // ─────────────────────────────────────────────────────────────────────────
  describe('Year section', () => {
    it('renders the years section title', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByText('Years')).toBeInTheDocument();
    });

    it('shows caret-up when year section is open (default)', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });

    it('renders a checkbox for each year', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      expect(checkboxes).toHaveLength(defaultYears.length);
    });

    it('renders the year labels', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();
    });

    it('checkboxes start unchecked', () => {
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      const checkboxes = screen.getAllByRole('checkbox');
      checkboxes.forEach(cb => expect(cb).not.toBeChecked());
    });

    it('toggles checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      const checkbox2024 = screen.getByRole('checkbox', { name: '2024' });
      await user.click(checkbox2024);
      expect(checkbox2024).toBeChecked();
    });

    it('clicking year label toggles the checkbox', async () => {
      const user = userEvent.setup();
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      const label2024 = screen.getByRole('button', { name: '2024' });
      await user.click(label2024);
      // Clicking the span[role="button"] calls onCheckYear → toggles checkbox
      const checkbox2024 = screen.getByRole('checkbox', { name: '2024' });
      expect(checkbox2024).toBeChecked();
    });

    it('collapses year section when section title is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<StatisticsMobileModal {...defaultProps} />);
      // Year section is open (caret-up visible). Click div[role="button"] to toggle
      const sectionButton = screen.getByRole('button', { name: 'Years' });
      await user.click(sectionButton);
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Apply Filters
  // ─────────────────────────────────────────────────────────────────────────
  describe('Apply Filters', () => {
    it('calls onUpdateYearsCallback with current years when apply is clicked', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderWithStore(
        <StatisticsMobileModal {...defaultProps} onUpdateYearsCallback={onUpdate} />
      );
      // Check 2024 then apply
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdate).toHaveBeenCalledOnce();
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ year: 2024, isChecked: true })])
      );
    });

    it('calls onCloseCallback when apply is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<StatisticsMobileModal {...defaultProps} onCloseCallback={onClose} />);
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
      renderWithStore(<StatisticsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByTestId('close-icon'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(<StatisticsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      // Simulate mousedown outside the modal (on document body directly)
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when clicking inside the modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<StatisticsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Footer Redux side-effect
  // ─────────────────────────────────────────────────────────────────────────
  describe('Footer dispatch', () => {
    it('dispatches setFooterVisibility(false) on mount when footer is enabled', () => {
      const store = configureStore({
        reducer: { footerReducer },
        preloadedState: { footerReducer: { enabled: true } },
      });
      render(
        <Provider store={store}>
          <StatisticsMobileModal {...defaultProps} />
        </Provider>
      );
      expect(store.getState().footerReducer.enabled).toBe(false);
    });

    it('dispatches setFooterVisibility(true) when apply is clicked', async () => {
      const user = userEvent.setup();
      const store = configureStore({
        reducer: { footerReducer },
        preloadedState: { footerReducer: { enabled: false } },
      });
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      render(
        <Provider store={store}>
          <StatisticsMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      // The apply handler dispatches setFooterVisibility(true).
      // Note: the "footer re-disable" useEffect then dispatches setFooterVisibility(false),
      // so we verify the dispatch call rather than the final store state.
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
