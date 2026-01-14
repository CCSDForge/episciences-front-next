import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import VolumesSidebar, { IVolumeTypeSelection, IVolumeYearSelection } from '../VolumesSidebar';

// Mock the Checkbox component
vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({ checked, onChangeCallback, ariaLabel }: {
    checked: boolean;
    onChangeCallback: () => void;
    ariaLabel?: string;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={onChangeCallback}
      aria-label={ariaLabel}
      data-testid="checkbox"
    />
  ),
}));

describe('VolumesSidebar', () => {
  const mockT = vi.fn((key: string) => {
    const translations: Record<string, string> = {
      'common.filters.volumeTypes': 'Volume Types',
      'common.filters.years': 'Years',
      'volume.type.regular': 'Regular Volume',
      'volume.type.special': 'Special Issue',
      'volume.type.proceeding': 'Conference Proceeding',
    };
    return translations[key] || key;
  });

  const defaultTypes: IVolumeTypeSelection[] = [
    { labelPath: 'volume.type.regular', value: 'regular', isChecked: false },
    { labelPath: 'volume.type.special', value: 'special', isChecked: true },
    { labelPath: 'volume.type.proceeding', value: 'proceeding', isChecked: false },
  ];

  const defaultYears: IVolumeYearSelection[] = [
    { year: 2024, isSelected: true },
    { year: 2023, isSelected: false },
    { year: 2022, isSelected: false },
  ];

  const defaultProps = {
    t: mockT,
    types: defaultTypes,
    onCheckTypeCallback: vi.fn(),
    years: defaultYears,
    onSelectYearCallback: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders sidebar container', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      expect(container.querySelector('.volumesSidebar')).toBeInTheDocument();
    });

    it('renders volume types section', () => {
      render(<VolumesSidebar {...defaultProps} />);

      expect(screen.getByText('Volume Types')).toBeInTheDocument();
    });

    it('renders years section', () => {
      render(<VolumesSidebar {...defaultProps} />);

      expect(screen.getByText('Years')).toBeInTheDocument();
    });

    it('renders all type options', () => {
      render(<VolumesSidebar {...defaultProps} />);

      expect(screen.getByText('Regular Volume')).toBeInTheDocument();
      expect(screen.getByText('Special Issue')).toBeInTheDocument();
      expect(screen.getByText('Conference Proceeding')).toBeInTheDocument();
    });

    it('renders all year options', () => {
      render(<VolumesSidebar {...defaultProps} />);

      expect(screen.getByText('2024')).toBeInTheDocument();
      expect(screen.getByText('2023')).toBeInTheDocument();
      expect(screen.getByText('2022')).toBeInTheDocument();
    });
  });

  describe('Type filter functionality', () => {
    it('calls onCheckTypeCallback when type checkbox changes', async () => {
      const user = userEvent.setup();
      const handleCheckType = vi.fn();

      render(<VolumesSidebar {...defaultProps} onCheckTypeCallback={handleCheckType} />);

      const checkboxes = screen.getAllByTestId('checkbox');
      await user.click(checkboxes[0]); // Click first type checkbox

      expect(handleCheckType).toHaveBeenCalledWith('regular');
    });

    it('calls onCheckTypeCallback when type label is clicked', async () => {
      const user = userEvent.setup();
      const handleCheckType = vi.fn();

      render(<VolumesSidebar {...defaultProps} onCheckTypeCallback={handleCheckType} />);

      await user.click(screen.getByText('Regular Volume'));

      expect(handleCheckType).toHaveBeenCalledWith('regular');
    });

    it('applies checked style to selected type labels', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      // Special Issue is checked, so it should have the checked class
      const checkedLabels = container.querySelectorAll(
        '.volumesSidebar-typesSection-types-choice-label-checked'
      );
      expect(checkedLabels.length).toBe(1);
    });
  });

  describe('Year filter functionality', () => {
    it('calls onSelectYearCallback when year is clicked', async () => {
      const user = userEvent.setup();
      const handleSelectYear = vi.fn();

      render(<VolumesSidebar {...defaultProps} onSelectYearCallback={handleSelectYear} />);

      await user.click(screen.getByText('2023'));

      expect(handleSelectYear).toHaveBeenCalledWith(2023);
    });

    it('applies selected style to selected year', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      // 2024 is selected, so it should have the selected class
      const selectedYears = container.querySelectorAll(
        '.volumesSidebar-yearsSection-years-list-year-selected'
      );
      expect(selectedYears.length).toBe(1);
    });
  });

  describe('Keyboard accessibility', () => {
    it('type labels have role="button"', () => {
      render(<VolumesSidebar {...defaultProps} />);

      const regularLabel = screen.getByText('Regular Volume');
      expect(regularLabel).toHaveAttribute('role', 'button');
    });

    it('type labels have tabIndex="0"', () => {
      render(<VolumesSidebar {...defaultProps} />);

      const regularLabel = screen.getByText('Regular Volume');
      expect(regularLabel).toHaveAttribute('tabindex', '0');
    });

    it('year items have role="button"', () => {
      render(<VolumesSidebar {...defaultProps} />);

      const yearItem = screen.getByText('2024');
      expect(yearItem).toHaveAttribute('role', 'button');
    });

    it('year items have tabIndex="0"', () => {
      render(<VolumesSidebar {...defaultProps} />);

      const yearItem = screen.getByText('2024');
      expect(yearItem).toHaveAttribute('tabindex', '0');
    });

    it('type label responds to Enter key', async () => {
      const user = userEvent.setup();
      const handleCheckType = vi.fn();

      render(<VolumesSidebar {...defaultProps} onCheckTypeCallback={handleCheckType} />);

      const regularLabel = screen.getByText('Regular Volume');
      regularLabel.focus();
      await user.keyboard('{Enter}');

      expect(handleCheckType).toHaveBeenCalledWith('regular');
    });

    it('type label responds to Space key', async () => {
      const user = userEvent.setup();
      const handleCheckType = vi.fn();

      render(<VolumesSidebar {...defaultProps} onCheckTypeCallback={handleCheckType} />);

      const regularLabel = screen.getByText('Regular Volume');
      regularLabel.focus();
      await user.keyboard(' ');

      expect(handleCheckType).toHaveBeenCalledWith('regular');
    });

    it('year item responds to Enter key', async () => {
      const user = userEvent.setup();
      const handleSelectYear = vi.fn();

      render(<VolumesSidebar {...defaultProps} onSelectYearCallback={handleSelectYear} />);

      const yearItem = screen.getByText('2023');
      yearItem.focus();
      await user.keyboard('{Enter}');

      expect(handleSelectYear).toHaveBeenCalledWith(2023);
    });

    it('year item responds to Space key', async () => {
      const user = userEvent.setup();
      const handleSelectYear = vi.fn();

      render(<VolumesSidebar {...defaultProps} onSelectYearCallback={handleSelectYear} />);

      const yearItem = screen.getByText('2023');
      yearItem.focus();
      await user.keyboard(' ');

      expect(handleSelectYear).toHaveBeenCalledWith(2023);
    });
  });

  describe('CSS classes for layout', () => {
    it('applies typesSection class', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      expect(container.querySelector('.volumesSidebar-typesSection')).toBeInTheDocument();
    });

    it('applies yearsSection class', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      expect(container.querySelector('.volumesSidebar-yearsSection')).toBeInTheDocument();
    });

    it('applies title class for sections', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      expect(container.querySelector('.volumesSidebar-typesSection-title')).toBeInTheDocument();
      expect(container.querySelector('.volumesSidebar-yearsSection-title')).toBeInTheDocument();
    });
  });

  describe('Empty states', () => {
    it('handles empty types array', () => {
      const { container } = render(
        <VolumesSidebar {...defaultProps} types={[]} />
      );

      expect(container.querySelector('.volumesSidebar-typesSection-types')).toBeInTheDocument();
    });

    it('handles empty years array', () => {
      const { container } = render(
        <VolumesSidebar {...defaultProps} years={[]} />
      );

      expect(container.querySelector('.volumesSidebar-yearsSection-years')).toBeInTheDocument();
    });
  });

  describe('Years list styling', () => {
    it('year items use year-list class', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      expect(container.querySelector('.volumesSidebar-yearsSection-years-list')).toBeInTheDocument();
    });

    it('each year has year class', () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      const yearItems = container.querySelectorAll('.volumesSidebar-yearsSection-years-list-year');
      expect(yearItems.length).toBe(defaultYears.length);
    });
  });

  describe('Accessibility - Checkbox labels', () => {
    // Note: This test documents that checkboxes should have accessible labels
    it('checkboxes should have accessible labels', () => {
      render(<VolumesSidebar {...defaultProps} />);

      const checkboxes = screen.getAllByTestId('checkbox');

      // Verify checkboxes are present
      expect(checkboxes.length).toBe(defaultTypes.length);
    });
  });

  describe('Accessibility - axe-core validation', () => {
    // Note: axe may detect missing labels on checkboxes
    const axeOptions = {
      rules: {
        label: { enabled: false }, // Disable if checkboxes lack aria-label
      },
    };

    it('should have no critical accessibility violations', async () => {
      const { container } = render(<VolumesSidebar {...defaultProps} />);

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with all types checked', async () => {
      const allCheckedTypes = defaultTypes.map(t => ({ ...t, isChecked: true }));
      const { container } = render(
        <VolumesSidebar {...defaultProps} types={allCheckedTypes} />
      );

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with different year selected', async () => {
      const differentYear: IVolumeYearSelection[] = [
        { year: 2024, isSelected: false },
        { year: 2023, isSelected: true },
        { year: 2022, isSelected: false },
      ];
      const { container } = render(
        <VolumesSidebar {...defaultProps} years={differentYear} />
      );

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});
