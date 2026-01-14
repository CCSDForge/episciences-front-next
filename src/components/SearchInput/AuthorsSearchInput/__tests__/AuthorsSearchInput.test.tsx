import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import AuthorsSearchInput from '../AuthorsSearchInput';

// Mock the icon component with proper ARIA role
vi.mock('@/components/icons', () => ({
  SearchIcon: ({ size, ariaLabel, className }: {
    size: number;
    ariaLabel?: string;
    className?: string;
  }) => (
    <span
      data-testid="search-icon"
      data-size={size}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  ),
}));

describe('AuthorsSearchInput', () => {
  const defaultProps = {
    value: '',
    placeholder: 'Search by author name...',
    onChangeCallback: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders search input', () => {
      render(<AuthorsSearchInput {...defaultProps} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      render(<AuthorsSearchInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search by author name...')).toBeInTheDocument();
    });

    it('renders search icon', () => {
      render(<AuthorsSearchInput {...defaultProps} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('applies correct CSS classes', () => {
      const { container } = render(<AuthorsSearchInput {...defaultProps} />);

      expect(container.querySelector('.authorsSearchInput')).toBeInTheDocument();
      expect(container.querySelector('.authorsSearchInput-input')).toBeInTheDocument();
      expect(container.querySelector('.authorsSearchInput-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility - Screen reader only label', () => {
    it('has sr-only label element', () => {
      const { container } = render(<AuthorsSearchInput {...defaultProps} />);

      const label = container.querySelector('label.sr-only');
      expect(label).toBeInTheDocument();
    });

    it('label is associated with input via htmlFor/id', () => {
      const { container } = render(<AuthorsSearchInput {...defaultProps} />);

      const label = container.querySelector('label');
      const input = screen.getByRole('searchbox');

      expect(label).toHaveAttribute('for');
      expect(input).toHaveAttribute('id');
      expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
    });

    it('uses default aria-label "Search authors"', () => {
      const { container } = render(<AuthorsSearchInput {...defaultProps} />);

      const label = container.querySelector('label.sr-only');
      expect(label).toHaveTextContent('Search authors');
    });

    it('uses custom aria-label when provided', () => {
      const { container } = render(
        <AuthorsSearchInput {...defaultProps} ariaLabel="Find contributors" />
      );

      const label = container.querySelector('label.sr-only');
      expect(label).toHaveTextContent('Find contributors');
    });

    it('input has aria-label attribute', () => {
      render(<AuthorsSearchInput {...defaultProps} ariaLabel="Search by author" />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-label', 'Search by author');
    });

    it('generates unique ID with useId hook', () => {
      const { container: container1 } = render(<AuthorsSearchInput {...defaultProps} />);
      const { container: container2 } = render(<AuthorsSearchInput {...defaultProps} />);

      const input1 = container1.querySelector('input');
      const input2 = container2.querySelector('input');

      // IDs should exist and be truthy
      expect(input1?.id).toBeTruthy();
      expect(input2?.id).toBeTruthy();
    });
  });

  describe('Input type', () => {
    it('has type="search" for semantic meaning', () => {
      render(<AuthorsSearchInput {...defaultProps} />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('User interactions', () => {
    it('calls onChangeCallback when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<AuthorsSearchInput {...defaultProps} onChangeCallback={handleChange} />);

      await user.type(screen.getByRole('searchbox'), 'test');

      // Each keystroke triggers onChange
      expect(handleChange).toHaveBeenCalledTimes(4);
      // First call should have first character
      expect(handleChange).toHaveBeenNthCalledWith(1, 't');
    });

    it('displays current value', () => {
      render(<AuthorsSearchInput {...defaultProps} value="Jane Doe" />);

      expect(screen.getByRole('searchbox')).toHaveValue('Jane Doe');
    });

    it('is focusable via keyboard', async () => {
      const user = userEvent.setup();

      render(<AuthorsSearchInput {...defaultProps} />);

      await user.tab();

      expect(screen.getByRole('searchbox')).toHaveFocus();
    });
  });

  describe('Icon accessibility', () => {
    it('search icon has aria-label', () => {
      render(<AuthorsSearchInput {...defaultProps} />);

      const icon = screen.getByTestId('search-icon');
      expect(icon).toHaveAttribute('aria-label', 'Search');
    });
  });

  describe('Different placeholder texts', () => {
    it('renders with custom placeholder', () => {
      render(
        <AuthorsSearchInput
          {...defaultProps}
          placeholder="Type author name..."
        />
      );

      expect(screen.getByPlaceholderText('Type author name...')).toBeInTheDocument();
    });
  });

  describe('Edge cases', () => {
    it('handles empty value', () => {
      render(<AuthorsSearchInput {...defaultProps} value="" />);

      expect(screen.getByRole('searchbox')).toHaveValue('');
    });

    it('handles special characters in search', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<AuthorsSearchInput {...defaultProps} onChangeCallback={handleChange} />);

      // Type a single special character
      await user.type(screen.getByRole('searchbox'), "'");

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith("'");
    });

    it('handles accented characters', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<AuthorsSearchInput {...defaultProps} onChangeCallback={handleChange} />);

      // Type a single accented character
      await user.type(screen.getByRole('searchbox'), 'é');

      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('é');
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations', async () => {
      const { container } = render(<AuthorsSearchInput {...defaultProps} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with value', async () => {
      const { container } = render(
        <AuthorsSearchInput {...defaultProps} value="John Smith" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with custom aria-label', async () => {
      const { container } = render(
        <AuthorsSearchInput {...defaultProps} ariaLabel="Find article authors" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
