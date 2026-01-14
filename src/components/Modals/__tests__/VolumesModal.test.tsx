import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import VolumesModal from '../VolumesModal/VolumesModal';

// Mock Checkbox component with proper accessibility attributes
vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({ checked, onChangeCallback, ariaLabel }: { checked: boolean; onChangeCallback: () => void; ariaLabel?: string }) => (
    <input type="checkbox" checked={checked} onChange={onChangeCallback} aria-label={ariaLabel} />
  ),
}));

// Mock FocusTrap
vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="focus-trap">{children}</div>,
}));

// Mock translation function
const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.filters.volumeTypes': 'Volume Types',
    'common.filters.years': 'Years',
    'volume.type.regular': 'Regular Volume',
    'volume.type.special': 'Special Issue',
  };
  return translations[key] || key;
});

const defaultProps = {
  t: mockT,
  types: [
    { labelPath: 'volume.type.regular', value: 'regular', isChecked: false },
    { labelPath: 'volume.type.special', value: 'special', isChecked: false },
  ],
  onCheckTypeCallback: vi.fn(),
  years: [
    { year: 2024, isSelected: false },
    { year: 2023, isSelected: true },
    { year: 2022, isSelected: false },
  ],
  onSelectYearCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

describe('VolumesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      render(<VolumesModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      render(<VolumesModal {...defaultProps} />);

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to modal title', () => {
      render(<VolumesModal {...defaultProps} />);

      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');

      // Verify the title element exists with correct id
      const title = document.getElementById('modal-title');
      expect(title).toBeInTheDocument();
      expect(title?.tagName).toBe('H2');
    });
  });

  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      render(<VolumesModal {...defaultProps} />);

      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  describe('Click Outside Handler', () => {
    it('closes modal when clicking outside', () => {
      const onClose = vi.fn();

      render(
        <div>
          <div data-testid="outside">Outside</div>
          <VolumesModal {...defaultProps} onCloseCallback={onClose} />
        </div>
      );

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onClose).toHaveBeenCalled();
    });

    it('does not close when clicking inside modal', () => {
      const onClose = vi.fn();

      render(<VolumesModal {...defaultProps} onCloseCallback={onClose} />);

      fireEvent.mouseDown(screen.getByRole('dialog'));

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  describe('Volume Types Section', () => {
    it('renders volume types with checkboxes', () => {
      render(<VolumesModal {...defaultProps} />);

      expect(screen.getByText('Volume Types')).toBeInTheDocument();
      expect(screen.getAllByRole('checkbox')).toHaveLength(2);
    });

    it('calls onCheckTypeCallback when checkbox is clicked', async () => {
      const user = userEvent.setup();
      const onCheckType = vi.fn();

      render(<VolumesModal {...defaultProps} onCheckTypeCallback={onCheckType} />);

      const checkboxes = screen.getAllByRole('checkbox');
      await user.click(checkboxes[0]);

      expect(onCheckType).toHaveBeenCalledWith('regular');
    });

    it('type labels are keyboard accessible', async () => {
      const user = userEvent.setup();
      const onCheckType = vi.fn();

      render(<VolumesModal {...defaultProps} onCheckTypeCallback={onCheckType} />);

      const typeLabel = screen.getByText('Regular Volume');
      typeLabel.focus();
      await user.keyboard('{Enter}');

      expect(onCheckType).toHaveBeenCalledWith('regular');
    });

    it('type labels have role="button" and tabIndex', () => {
      render(<VolumesModal {...defaultProps} />);

      const typeLabel = screen.getByText('Regular Volume');
      expect(typeLabel).toHaveAttribute('role', 'button');
      expect(typeLabel).toHaveAttribute('tabIndex', '0');
    });
  });

  describe('Years Section', () => {
    it('renders years list', () => {
      render(<VolumesModal {...defaultProps} />);

      expect(screen.getByText('Years')).toBeInTheDocument();
      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();
    });

    it('calls onSelectYearCallback when year is clicked', async () => {
      const user = userEvent.setup();
      const onSelectYear = vi.fn();

      render(<VolumesModal {...defaultProps} onSelectYearCallback={onSelectYear} />);

      await user.click(screen.getByText('2024'));

      expect(onSelectYear).toHaveBeenCalledWith(2024);
    });

    it('years are keyboard accessible', async () => {
      const user = userEvent.setup();
      const onSelectYear = vi.fn();

      render(<VolumesModal {...defaultProps} onSelectYearCallback={onSelectYear} />);

      const yearButton = screen.getByText('2024');
      yearButton.focus();
      await user.keyboard('{Enter}');

      expect(onSelectYear).toHaveBeenCalledWith(2024);
    });

    it('year buttons have role="button" and tabIndex', () => {
      render(<VolumesModal {...defaultProps} />);

      const yearButton = screen.getByText('2024');
      expect(yearButton).toHaveAttribute('role', 'button');
      expect(yearButton).toHaveAttribute('tabIndex', '0');
    });

    it('applies selected class to selected year', () => {
      render(<VolumesModal {...defaultProps} />);

      const selectedYear = screen.getByText('2023');
      expect(selectedYear).toHaveClass('yearsSectionYearsListYearSelected');
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<VolumesModal {...defaultProps} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with selected items', async () => {
      const propsWithSelections = {
        ...defaultProps,
        types: [
          { labelPath: 'volume.type.regular', value: 'regular', isChecked: true },
          { labelPath: 'volume.type.special', value: 'special', isChecked: false },
        ],
        years: [
          { year: 2024, isSelected: true },
          { year: 2023, isSelected: false },
        ],
      };

      const { container } = render(<VolumesModal {...propsWithSelections} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
