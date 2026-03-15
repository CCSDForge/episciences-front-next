import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import VolumesMobileModal from '../VolumesMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';

// --- Mocks ---

vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ onClick, ariaLabel }: any) => (
    <button data-testid="close-icon" onClick={onClick} aria-label={ariaLabel}>
      ×
    </button>
  ),
  CaretUpGreyIcon: ({ onClick, ariaLabel }: any) => (
    <span data-testid={`caret-up-${ariaLabel ?? 'default'}`} onClick={onClick} role="img" />
  ),
  CaretDownGreyIcon: ({ onClick, ariaLabel }: any) => (
    <span data-testid={`caret-down-${ariaLabel ?? 'default'}`} onClick={onClick} role="img" />
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
    'common.filters.years': 'Years',
    'common.filters.applyFilters': 'Apply Filters',
    'common.filters.clearAll': 'Clear All',
    'common.volumeTypes.issue': 'Issue',
    'common.volumeTypes.proceedings': 'Proceedings',
  };
  return translations[key] ?? key;
});

const defaultTypes = [
  { labelPath: 'common.volumeTypes.issue', value: 'issue', isChecked: false },
  { labelPath: 'common.volumeTypes.proceedings', value: 'proceedings', isChecked: false },
];

const defaultYears = [
  { year: 2024, isSelected: false },
  { year: 2023, isSelected: false },
];

const defaultProps = {
  t: mockT,
  initialTypes: defaultTypes,
  onUpdateTypesCallback: vi.fn(),
  initialYears: defaultYears,
  onUpdateYearsCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement, footerEnabled = false) => {
  const store = createMockStore(footerEnabled);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('VolumesMobileModal', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to the title element', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
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
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Type section — closed by default
  // ─────────────────────────────────────────────────────────────────────────
  describe('Type section', () => {
    it('renders the document types title', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByText('Document Types')).toBeInTheDocument();
    });

    it('renders a checkbox for each type', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      // Both type and year checkboxes; type checkboxes labelled via t(`common.volumeTypes.${value}`)
      expect(screen.getByRole('checkbox', { name: 'Issue' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: 'Proceedings' })).toBeInTheDocument();
    });

    it('type checkboxes start unchecked', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: 'Issue' })).not.toBeChecked();
      expect(screen.getByRole('checkbox', { name: 'Proceedings' })).not.toBeChecked();
    });

    it('toggles type checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Issue' }));
      expect(screen.getByRole('checkbox', { name: 'Issue' })).toBeChecked();
    });

    it('opens type section on title click', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('button', { name: 'Document Types' }));
      // After click the caret changes; we check the section title button still exists
      expect(screen.getByRole('button', { name: 'Document Types' })).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Year section — closed by default
  // ─────────────────────────────────────────────────────────────────────────
  describe('Year section', () => {
    it('renders the years title', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByText('Years')).toBeInTheDocument();
    });

    it('renders a checkbox for each year', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: '2024' })).toBeInTheDocument();
      expect(screen.getByRole('checkbox', { name: '2023' })).toBeInTheDocument();
    });

    it('year checkboxes start unchecked', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.getByRole('checkbox', { name: '2024' })).not.toBeChecked();
    });

    it('toggles year checkbox when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2023' }));
      expect(screen.getByRole('checkbox', { name: '2023' })).toBeChecked();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Tags
  // ─────────────────────────────────────────────────────────────────────────
  describe('Tags', () => {
    it('shows no tags initially', () => {
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('shows a tag for a checked type', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Issue' }));
      expect(screen.getByTestId('tag')).toHaveTextContent('Issue');
    });

    it('shows a tag for a selected year', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      expect(screen.getByTestId('tag')).toHaveTextContent('2024');
    });

    it('shows tags for both a type and a year simultaneously', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Proceedings' }));
      await user.click(screen.getByRole('checkbox', { name: '2023' }));
      expect(screen.getAllByTestId('tag')).toHaveLength(2);
    });

    it('removes a type tag when its close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Issue' }));
      await user.click(screen.getByRole('button', { name: 'Remove Issue filter' }));
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('removes a year tag when its close button is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await user.click(screen.getByRole('button', { name: 'Remove 2024 filter' }));
      expect(screen.queryByTestId('tag')).not.toBeInTheDocument();
    });

    it('clears all tags when Clear All is clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumesMobileModal {...defaultProps} />);
      await user.click(screen.getByRole('checkbox', { name: 'Issue' }));
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
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
      const onUpdateTypes = vi.fn();
      renderWithStore(
        <VolumesMobileModal {...defaultProps} onUpdateTypesCallback={onUpdateTypes} />
      );
      await user.click(screen.getByRole('checkbox', { name: 'Issue' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdateTypes).toHaveBeenCalledOnce();
      expect(onUpdateTypes).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ value: 'issue', isChecked: true })])
      );
    });

    it('calls onUpdateYearsCallback with the current years on apply', async () => {
      const user = userEvent.setup();
      const onUpdateYears = vi.fn();
      renderWithStore(
        <VolumesMobileModal {...defaultProps} onUpdateYearsCallback={onUpdateYears} />
      );
      await user.click(screen.getByRole('checkbox', { name: '2024' }));
      await user.click(screen.getByRole('button', { name: 'Apply Filters' }));
      expect(onUpdateYears).toHaveBeenCalledOnce();
      expect(onUpdateYears).toHaveBeenCalledWith(
        expect.arrayContaining([expect.objectContaining({ year: 2024, isSelected: true })])
      );
    });

    it('calls onCloseCallback when apply is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
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
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByTestId('close-icon'));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when clicking inside the modal', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('dialog'));
      expect(onClose).not.toHaveBeenCalled();
    });

    it('calls onCloseCallback when Escape key is pressed', () => {
      const onClose = vi.fn();
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'Escape' });
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('does not close when a non-Escape key is pressed', () => {
      const onClose = vi.fn();
      renderWithStore(<VolumesMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.keyDown(document, { key: 'Enter' });
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
          <VolumesMobileModal {...defaultProps} />
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
          <VolumesMobileModal {...defaultProps} />
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
          <VolumesMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByTestId('close-icon'));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
