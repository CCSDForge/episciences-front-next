import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import {
  SearchIcon,
  CaretDownIcon,
  CaretDownBlackIcon,
  CaretDownWhiteIcon,
  CaretUpBlackIcon,
  CaretLeftBlackIcon,
  CaretRightBlackIcon,
  BurgerIcon,
  CloseBlackIcon,
  DownloadBlackIcon,
  ExternalLinkBlackIcon,
  TranslateIcon,
  FilterIcon,
} from '../index';

describe('Icon Components', () => {
  describe('SearchIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<SearchIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('sets aria-hidden="true" when no ariaLabel provided', () => {
      const { container } = render(<SearchIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets aria-label and role="img" when ariaLabel provided', () => {
      const { container } = render(<SearchIcon ariaLabel="Search" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Search');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-hidden', 'false');
    });

    it('applies custom size', () => {
      const { container } = render(<SearchIcon size={32} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(svg).toHaveAttribute('height', '32');
    });

    it('applies custom className', () => {
      const { container } = render(<SearchIcon className="custom-class" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveClass('custom-class');
    });

    it('applies custom color', () => {
      const { container } = render(<SearchIcon color="#FF0000" />);

      const circle = container.querySelector('circle');
      expect(circle).toHaveAttribute('stroke', '#FF0000');
    });
  });

  describe('CaretDownIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<CaretDownIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('sets aria-hidden="true" when no ariaLabel', () => {
      const { container } = render(<CaretDownIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
    });

    it('sets aria-label and role when ariaLabel provided', () => {
      const { container } = render(<CaretDownIcon ariaLabel="Expand" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Expand');
      expect(svg).toHaveAttribute('role', 'img');
    });

    it('handles onClick event', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(<CaretDownIcon onClick={handleClick} />);

      const svg = container.querySelector('svg');
      await user.click(svg!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });

    it('shows pointer cursor when onClick is provided', () => {
      const { container } = render(<CaretDownIcon onClick={() => {}} />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveStyle({ cursor: 'pointer' });
    });

    it('has no cursor style when onClick is not provided', () => {
      const { container } = render(<CaretDownIcon />);

      const svg = container.querySelector('svg');
      // cursor should be undefined or not set
      expect(svg?.style.cursor).toBeFalsy();
    });
  });

  describe('Color variants', () => {
    it('CaretDownBlackIcon uses black color', () => {
      const { container } = render(<CaretDownBlackIcon />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke', '#000000');
    });

    it('CaretDownWhiteIcon uses white color', () => {
      const { container } = render(<CaretDownWhiteIcon />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke', '#FFFFFF');
    });

    it('CaretUpBlackIcon renders correctly', () => {
      const { container } = render(<CaretUpBlackIcon ariaLabel="Collapse" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Collapse');
    });

    it('CaretLeftBlackIcon renders correctly', () => {
      const { container } = render(<CaretLeftBlackIcon ariaLabel="Previous" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Previous');
    });

    it('CaretRightBlackIcon renders correctly', () => {
      const { container } = render(<CaretRightBlackIcon ariaLabel="Next" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Next');
    });
  });

  describe('BurgerIcon', () => {
    it('renders burger menu icon', () => {
      const { container } = render(<BurgerIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports ariaLabel for accessibility', () => {
      const { container } = render(<BurgerIcon ariaLabel="Menu" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Menu');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  describe('CloseIcon', () => {
    it('renders close icon', () => {
      const { container } = render(<CloseBlackIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports click handler', async () => {
      const user = userEvent.setup();
      const handleClick = vi.fn();

      const { container } = render(<CloseBlackIcon onClick={handleClick} />);

      const svg = container.querySelector('svg');
      await user.click(svg!);

      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('DownloadIcon', () => {
    it('renders download icon', () => {
      const { container } = render(<DownloadBlackIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports ariaLabel', () => {
      const { container } = render(<DownloadBlackIcon ariaLabel="Download PDF" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Download PDF');
    });
  });

  describe('ExternalLinkIcon', () => {
    it('renders external link icon', () => {
      const { container } = render(<ExternalLinkBlackIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports ariaLabel', () => {
      const { container } = render(<ExternalLinkBlackIcon ariaLabel="Opens in new tab" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Opens in new tab');
    });
  });

  describe('TranslateIcon', () => {
    it('renders translate icon', () => {
      const { container } = render(<TranslateIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports ariaLabel', () => {
      const { container } = render(<TranslateIcon ariaLabel="Change language" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Change language');
    });
  });

  describe('FilterIcon', () => {
    it('renders filter icon', () => {
      const { container } = render(<FilterIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });

    it('supports ariaLabel', () => {
      const { container } = render(<FilterIcon ariaLabel="Filter results" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-label', 'Filter results');
    });
  });

  describe('Accessibility - General patterns', () => {
    it('decorative icons are hidden from screen readers', () => {
      const { container } = render(<SearchIcon />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'true');
      expect(svg).not.toHaveAttribute('role');
    });

    it('informative icons are announced to screen readers', () => {
      const { container } = render(<SearchIcon ariaLabel="Search articles" />);

      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('aria-hidden', 'false');
      expect(svg).toHaveAttribute('role', 'img');
      expect(svg).toHaveAttribute('aria-label', 'Search articles');
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('SearchIcon with ariaLabel has no violations', async () => {
      const { container } = render(<SearchIcon ariaLabel="Search" />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('CaretDownIcon with ariaLabel has no violations', async () => {
      const { container } = render(<CaretDownBlackIcon ariaLabel="Expand menu" />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('BurgerIcon with ariaLabel has no violations', async () => {
      const { container } = render(<BurgerIcon ariaLabel="Open menu" />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('multiple icons with labels have no violations', async () => {
      const { container } = render(
        <div>
          <SearchIcon ariaLabel="Search" />
          <CaretDownBlackIcon ariaLabel="Expand" />
          <CloseBlackIcon ariaLabel="Close" />
          <DownloadBlackIcon ariaLabel="Download" />
        </div>
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
