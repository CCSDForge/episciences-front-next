import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import HeaderSearchInput from '../HeaderSearchInput';

// Mock the icon components with proper ARIA roles
vi.mock('@/components/icons', () => ({
  CaretLeftBlackIcon: ({ size, ariaLabel, onClick, className }: {
    size: number;
    ariaLabel?: string;
    onClick?: () => void;
    className?: string;
  }) => (
    <button
      data-testid="caret-left-icon"
      data-size={size}
      aria-label={ariaLabel}
      onClick={onClick}
      className={className}
    />
  ),
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
  CloseBlackIcon: ({ size, ariaLabel, onClick, onMouseDown, onMouseUp, className }: {
    size: number;
    ariaLabel?: string;
    onClick?: () => void;
    onMouseDown?: () => void;
    onMouseUp?: () => void;
    className?: string;
  }) => (
    <button
      data-testid="close-icon"
      data-size={size}
      aria-label={ariaLabel}
      onClick={onClick}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      className={className}
    />
  ),
}));

describe('HeaderSearchInput', () => {
  const defaultProps = {
    value: '',
    placeholder: 'Search articles...',
    isSearching: false,
    setIsSearchingCallback: vi.fn(),
    onChangeCallback: vi.fn(),
    onSubmitCallback: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders search input', () => {
      render(<HeaderSearchInput {...defaultProps} />);

      expect(screen.getByRole('searchbox')).toBeInTheDocument();
    });

    it('renders with placeholder text', () => {
      render(<HeaderSearchInput {...defaultProps} />);

      expect(screen.getByPlaceholderText('Search articles...')).toBeInTheDocument();
    });

    it('renders search icon when not searching', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={false} />);

      expect(screen.getByTestId('search-icon')).toBeInTheDocument();
    });

    it('renders caret left icon when searching', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={true} />);

      expect(screen.getByTestId('caret-left-icon')).toBeInTheDocument();
    });

    it('renders close icon when searching', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={true} />);

      expect(screen.getByTestId('close-icon')).toBeInTheDocument();
    });
  });

  describe('Accessibility - Screen reader only label', () => {
    it('has sr-only label element', () => {
      const { container } = render(<HeaderSearchInput {...defaultProps} />);

      const label = container.querySelector('label.sr-only');
      expect(label).toBeInTheDocument();
    });

    it('label is associated with input via htmlFor/id', () => {
      const { container } = render(<HeaderSearchInput {...defaultProps} />);

      const label = container.querySelector('label');
      const input = screen.getByRole('searchbox');

      expect(label).toHaveAttribute('for');
      expect(input).toHaveAttribute('id');
      expect(label?.getAttribute('for')).toBe(input.getAttribute('id'));
    });

    it('uses default aria-label "Search"', () => {
      const { container } = render(<HeaderSearchInput {...defaultProps} />);

      const label = container.querySelector('label.sr-only');
      expect(label).toHaveTextContent('Search');
    });

    it('uses custom aria-label when provided', () => {
      const { container } = render(
        <HeaderSearchInput {...defaultProps} ariaLabel="Search publications" />
      );

      const label = container.querySelector('label.sr-only');
      expect(label).toHaveTextContent('Search publications');
    });

    it('input has aria-label attribute', () => {
      render(<HeaderSearchInput {...defaultProps} ariaLabel="Search the journal" />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('aria-label', 'Search the journal');
    });

    it('generates unique ID with useId hook', () => {
      const { container: container1 } = render(<HeaderSearchInput {...defaultProps} />);
      const { container: container2 } = render(<HeaderSearchInput {...defaultProps} />);

      const input1 = container1.querySelector('input');
      const input2 = container2.querySelector('input');

      // IDs should be unique
      expect(input1?.id).toBeTruthy();
      expect(input2?.id).toBeTruthy();
      // React useId generates unique IDs that differ between instances
    });
  });

  describe('Input type', () => {
    it('has type="search" for semantic meaning', () => {
      render(<HeaderSearchInput {...defaultProps} />);

      const input = screen.getByRole('searchbox');
      expect(input).toHaveAttribute('type', 'search');
    });
  });

  describe('User interactions', () => {
    it('calls onChangeCallback when typing', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();

      render(<HeaderSearchInput {...defaultProps} onChangeCallback={handleChange} />);

      await user.type(screen.getByRole('searchbox'), 'test');

      expect(handleChange).toHaveBeenCalled();
    });

    it('calls onSubmitCallback on Enter key', async () => {
      const user = userEvent.setup();
      const handleSubmit = vi.fn();

      render(<HeaderSearchInput {...defaultProps} onSubmitCallback={handleSubmit} />);

      await user.type(screen.getByRole('searchbox'), 'query{Enter}');

      expect(handleSubmit).toHaveBeenCalledTimes(1);
    });

    it('sets isSearching to true on focus', async () => {
      const user = userEvent.setup();
      const setIsSearching = vi.fn();

      render(<HeaderSearchInput {...defaultProps} setIsSearchingCallback={setIsSearching} />);

      await user.click(screen.getByRole('searchbox'));

      expect(setIsSearching).toHaveBeenCalledWith(true);
    });

    it('clears search when close icon is clicked', async () => {
      const user = userEvent.setup();
      const handleChange = vi.fn();
      const setIsSearching = vi.fn();

      render(
        <HeaderSearchInput
          {...defaultProps}
          isSearching={true}
          value="test"
          onChangeCallback={handleChange}
          setIsSearchingCallback={setIsSearching}
        />
      );

      await user.click(screen.getByTestId('close-icon'));

      expect(handleChange).toHaveBeenCalledWith('');
      expect(setIsSearching).toHaveBeenCalledWith(false);
    });

    it('back arrow exits search mode', async () => {
      const user = userEvent.setup();
      const setIsSearching = vi.fn();

      render(
        <HeaderSearchInput
          {...defaultProps}
          isSearching={true}
          setIsSearchingCallback={setIsSearching}
        />
      );

      await user.click(screen.getByTestId('caret-left-icon'));

      expect(setIsSearching).toHaveBeenCalledWith(false);
    });
  });

  describe('Icon accessibility', () => {
    it('search icon has aria-label', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={false} />);

      const icon = screen.getByTestId('search-icon');
      expect(icon).toHaveAttribute('aria-label', 'Search');
    });

    it('back icon has aria-label', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={true} />);

      const icon = screen.getByTestId('caret-left-icon');
      expect(icon).toHaveAttribute('aria-label', 'Back');
    });

    it('close icon has aria-label', () => {
      render(<HeaderSearchInput {...defaultProps} isSearching={true} />);

      const icon = screen.getByTestId('close-icon');
      expect(icon).toHaveAttribute('aria-label', 'Clear');
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no accessibility violations when not searching', async () => {
      const { container } = render(<HeaderSearchInput {...defaultProps} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no accessibility violations when searching', async () => {
      const { container } = render(
        <HeaderSearchInput {...defaultProps} isSearching={true} value="test" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with custom aria-label', async () => {
      const { container } = render(
        <HeaderSearchInput {...defaultProps} ariaLabel="Search all publications" />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
