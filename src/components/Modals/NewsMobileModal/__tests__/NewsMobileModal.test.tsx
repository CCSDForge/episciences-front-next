import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import NewsMobileModal from '../NewsMobileModal';
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

const createMockStore = (footerEnabled = false) =>
  configureStore({
    reducer: { footerReducer },
    preloadedState: { footerReducer: { enabled: footerEnabled } },
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
  { year: 2024, isSelected: false },
  { year: 2023, isSelected: false },
  { year: 2022, isSelected: false },
];

const defaultProps = {
  t: mockT,
  years: defaultYears,
  onUpdateYearsCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement, footerEnabled = false) => {
  const store = createMockStore(footerEnabled);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('NewsMobileModal', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title element', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      const titleId = dialog.getAttribute('aria-labelledby');
      expect(titleId).toBeTruthy();
      expect(document.getElementById(titleId!)).toHaveTextContent('Filters');
    });

    it('shows filter title text', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Trap
  // ─────────────────────────────────────────────────────────────────────────
  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Year section — opened by default
  // ─────────────────────────────────────────────────────────────────────────
  describe('Year section', () => {
    it('renders the years section title', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByText('Years')).toBeInTheDocument();
    });

    it('shows caret-up when year section is open (default)', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
      expect(screen.queryByTestId('caret-down')).not.toBeInTheDocument();
    });

    it('renders a checkbox for each year', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getAllByRole('checkbox')).toHaveLength(defaultYears.length);
    });

    it('renders all year labels', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();
    });

    it('checkboxes start unchecked', () => {
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      screen.getAllByRole('checkbox').forEach(cb => expect(cb).not.toBeChecked());
    });

    it('toggles a checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      const cb = screen.getByRole('checkbox', { name: '2024' });
      await user.click(cb);
      expect(cb).toBeChecked();
    });

    it('clicking year label toggles the corresponding checkbox', async () => {
      const user = userEvent.setup();
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: '2024' }));
      expect(screen.getByRole('checkbox', { name: '2024' })).toBeChecked();
    });

    it('collapses year section when title is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Years' }));
      expect(screen.queryByTestId('caret-up')).not.toBeInTheDocument();
      expect(screen.getByTestId('caret-down')).toBeInTheDocument();
    });

    it('re-opens year section after a second click on title', async () => {
      const user = userEvent.setup();
      renderWithStore(<NewsMobileModal {...defaultProps} />);
      const yearsBtn = screen.getByRole('button', { name: 'Years' });
      await user.click(yearsBtn);
      await user.click(yearsBtn);
      expect(screen.getByTestId('caret-up')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Apply Filters
  // ─────────────────────────────────────────────────────────────────────────
  describe('Apply Filters', () => {
    it('calls onUpdateYearsCallback with the updated years on apply', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onUpdateYearsCallback={onUpdate} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdate).toHaveBeenCalledOnce();
      expect(onUpdate).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ year: 2024, isSelected: true })])
      );
    });

    it('calls onCloseCallback when apply is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('preserves unselected years in the callback payload', async () => {
      const user = userEvent.setup();
      const onUpdate = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onUpdateYearsCallback={onUpdate} />);
      await user.click(screen.getByRole('checkbox', { name: '2023' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      const payload = onUpdate.mock.calls[0][0];
      expect(payload).toHaveLength(3);
      expect(payload.find((y: any) => y.year === 2024).isSelected).toBe(false);
      expect(payload.find((y: any) => y.year === 2023).isSelected).toBe(true);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Close
  // ─────────────────────────────────────────────────────────────────────────
  describe('Close', () => {
    it('calls onCloseCallback when close icon is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByTestId('close-icon'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when clicking inside the modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onCloseCallback when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when a non-Escape key is pressed', () => {
      const onClose = vi.fn();
      renderWithStore(<NewsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'ArrowDown' });
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
          <NewsMobileModal {...defaultProps} />
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
          <NewsMobileModal {...defaultProps} />
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
          <NewsMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByTestId('close-icon'));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
