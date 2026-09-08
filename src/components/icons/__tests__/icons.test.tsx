import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import {
  SearchIcon,
  CaretDownIcon,
  CaretDownBlackIcon,
  CaretDownWhiteIcon,
  CaretUpIcon,
  CaretUpBlackIcon,
  CaretUpWhiteIcon,
  CaretUpGreyIcon,
  CaretUpGreyLightIcon,
  CaretUpBlueIcon,
  CaretUpRedIcon,
  CaretLeftIcon,
  CaretLeftBlackIcon,
  CaretLeftWhiteIcon,
  CaretLeftGreyIcon,
  CaretLeftGreyLightIcon,
  CaretLeftBlueIcon,
  CaretLeftRedIcon,
  CaretRightIcon,
  CaretRightBlackIcon,
  CaretRightWhiteIcon,
  CaretRightGreyIcon,
  CaretRightGreyLightIcon,
  CaretRightBlueIcon,
  CaretRightRedIcon,
  ArrowRightIcon,
  ArrowRightBlueIcon,
  ArrowRightWhiteIcon,
  ArrowRightRedIcon,
  ArrowRightBlackIcon,
  BurgerIcon,
  CloseBlackIcon,
  DownloadBlackIcon,
  ExternalLinkBlackIcon,
  TranslateIcon,
  FilterIcon,
  QuoteIcon,
  QuoteRedIcon,
  QuoteBlackIcon,
  ShareIcon,
  FileIcon,
  FileGreyIcon,
  FileBlueIcon,
  FileBlackIcon,
  ListIcon,
  ListGreyIcon,
  ListRedIcon,
  ListBlackIcon,
  TileIcon,
  TileGreyIcon,
  TileRedIcon,
  TileBlackIcon,
  TagIcon,
  UserIcon,
  UserCircleIcon,
  MinusCircleIcon,
  PlusCircleIcon,
  RorIcon,
  LogoTextIcon,
  OrcidIcon,
  FacebookIcon,
  TwitterIcon,
  LinkedinIcon,
  MailIcon,
  AtIcon,
  BlueskyIcon,
  MastodonIcon,
  WhatsappIcon,
} from '../index';

vi.mock('next/image', () => ({
  default: ({ src, alt, width, height, className }: Record<string, unknown>) => (
    <img
      src={src as string}
      alt={alt as string}
      width={width as number}
      height={height as number}
      className={className as string}
    />
  ),
}));

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
    it('CaretDownBlackIcon follows the ambient text color (dark-mode safe)', () => {
      const { container } = render(<CaretDownBlackIcon />);

      const path = container.querySelector('path');
      expect(path).toHaveAttribute('stroke', 'currentColor');
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

  describe('QuoteIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<QuoteIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('applies custom size and color', () => {
      const { container } = render(<QuoteIcon size={32} color="#123456" />);
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '32');
      expect(container.querySelector('path')).toHaveAttribute('fill', '#123456');
    });

    it('renders QuoteRedIcon and QuoteBlackIcon variants', () => {
      const red = render(<QuoteRedIcon ariaLabel="Quote" />);
      expect(red.container.querySelector('path')).toHaveAttribute('fill', '#C1002A');

      const black = render(<QuoteBlackIcon ariaLabel="Quote" />);
      expect(black.container.querySelector('path')).toHaveAttribute('fill', 'currentColor');
    });
  });

  describe('ShareIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<ShareIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('applies custom size, className and ariaLabel', () => {
      const { container } = render(
        <ShareIcon size={24} className="share-icon" ariaLabel="Share article" />
      );
      const svg = container.querySelector('svg');
      expect(svg).toHaveAttribute('width', '24');
      expect(svg).toHaveClass('share-icon');
      expect(svg).toHaveAttribute('aria-label', 'Share article');
      expect(svg).toHaveAttribute('role', 'img');
    });
  });

  describe('ArrowRightIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<ArrowRightIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders all color variants', () => {
      expect(render(<ArrowRightBlueIcon />).container.querySelector('path')).toHaveAttribute(
        'stroke',
        '#2563EB'
      );
      expect(render(<ArrowRightWhiteIcon />).container.querySelector('path')).toHaveAttribute(
        'stroke',
        '#FFFFFF'
      );
      expect(render(<ArrowRightRedIcon />).container.querySelector('path')).toHaveAttribute(
        'stroke',
        '#C1002A'
      );
      expect(render(<ArrowRightBlackIcon />).container.querySelector('path')).toHaveAttribute(
        'stroke',
        'currentColor'
      );
    });
  });

  describe('CaretUpIcon interactions', () => {
    it('calls event handlers and shows pointer cursor', async () => {
      const user = userEvent.setup();
      const onClick = vi.fn();
      const onMouseEnter = vi.fn();
      const onMouseLeave = vi.fn();

      const { container } = render(
        <CaretUpIcon onClick={onClick} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave} />
      );
      const svg = container.querySelector('svg')!;

      await user.click(svg);
      expect(onClick).toHaveBeenCalledTimes(1);
      expect(svg).toHaveStyle({ cursor: 'pointer' });

      await user.hover(svg);
      expect(onMouseEnter).toHaveBeenCalled();

      await user.unhover(svg);
      expect(onMouseLeave).toHaveBeenCalled();
    });

    it('has no cursor style when onClick is absent', () => {
      const { container } = render(<CaretUpIcon />);
      expect(container.querySelector('svg')?.style.cursor).toBeFalsy();
    });

    it('renders all color variants', () => {
      expect(render(<CaretUpBlackIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretUpWhiteIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretUpGreyIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretUpGreyLightIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretUpBlueIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretUpRedIcon />).container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('CaretLeftIcon interactions', () => {
    it('calls all event handlers and rotates with pointer cursor', async () => {
      const user = userEvent.setup();
      const handlers = {
        onClick: vi.fn(),
        onMouseEnter: vi.fn(),
        onMouseLeave: vi.fn(),
        onMouseDown: vi.fn(),
        onMouseUp: vi.fn(),
      };

      const { container } = render(<CaretLeftIcon {...handlers} />);
      const svg = container.querySelector('svg')!;

      await user.click(svg);
      expect(handlers.onClick).toHaveBeenCalledTimes(1);
      expect(svg).toHaveStyle({ cursor: 'pointer', transform: 'rotate(-90deg)' });
    });

    it('has no cursor style when onClick is absent', () => {
      const { container } = render(<CaretLeftIcon />);
      expect(container.querySelector('svg')).toHaveStyle({ transform: 'rotate(-90deg)' });
    });

    it('renders all color variants', () => {
      expect(render(<CaretLeftBlackIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretLeftWhiteIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretLeftGreyIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretLeftGreyLightIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretLeftBlueIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretLeftRedIcon />).container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('CaretRightIcon', () => {
    it('renders with default props and rotation', () => {
      const { container } = render(<CaretRightIcon />);
      expect(container.querySelector('svg')).toHaveStyle({ transform: 'rotate(90deg)' });
    });

    it('renders all color variants', () => {
      expect(render(<CaretRightBlackIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretRightWhiteIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretRightGreyIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(
        render(<CaretRightGreyLightIcon />).container.querySelector('svg')
      ).toBeInTheDocument();
      expect(render(<CaretRightBlueIcon />).container.querySelector('svg')).toBeInTheDocument();
      expect(render(<CaretRightRedIcon />).container.querySelector('svg')).toBeInTheDocument();
    });
  });

  describe('FileIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<FileIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders all color variants', () => {
      expect(render(<FileGreyIcon />).container.querySelector('path')).toHaveAttribute(
        'fill',
        '#7d7d8e'
      );
      expect(render(<FileBlueIcon />).container.querySelector('path')).toHaveAttribute(
        'fill',
        '#2563EB'
      );
      expect(render(<FileBlackIcon />).container.querySelector('path')).toHaveAttribute(
        'fill',
        'currentColor'
      );
    });
  });

  describe('ListIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<ListIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders all color variants', () => {
      expect(render(<ListGreyIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        '#7d7d8e'
      );
      expect(render(<ListRedIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        '#C1002A'
      );
      expect(render(<ListBlackIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        'currentColor'
      );
    });
  });

  describe('TileIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<TileIcon />);
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    it('renders all color variants', () => {
      expect(render(<TileGreyIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        '#7d7d8e'
      );
      expect(render(<TileRedIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        '#C1002A'
      );
      expect(render(<TileBlackIcon />).container.querySelector('rect')).toHaveAttribute(
        'fill',
        'currentColor'
      );
    });
  });

  describe('TagIcon', () => {
    it('renders with default props and ariaLabel', () => {
      const { container } = render(<TagIcon ariaLabel="Tag" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', 'Tag');
    });
  });

  describe('UserIcon', () => {
    it('renders with default props', () => {
      const { container } = render(<UserIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '24');
    });

    it('applies custom color', () => {
      const { container } = render(<UserIcon color="#123456" />);
      expect(container.querySelector('path')).toHaveAttribute('fill', '#123456');
    });
  });

  describe('UserCircleIcon', () => {
    it('renders with default size', () => {
      const { container } = render(<UserCircleIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '28');
    });

    it('applies custom color to background circle', () => {
      const { container } = render(<UserCircleIcon color="#123456" />);
      expect(container.querySelector('circle')).toHaveAttribute('fill', '#123456');
    });
  });

  describe('MinusCircleIcon / PlusCircleIcon', () => {
    it('renders MinusCircleIcon', () => {
      const { container } = render(<MinusCircleIcon ariaLabel="Remove" />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Remove');
    });

    it('renders PlusCircleIcon', () => {
      const { container } = render(<PlusCircleIcon ariaLabel="Add" />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-label', 'Add');
    });
  });

  describe('RorIcon', () => {
    it('renders with default props and a default ariaLabel', () => {
      const { container } = render(<RorIcon />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('aria-label', 'ROR logo');
    });

    it('applies custom size and color', () => {
      const { container } = render(<RorIcon size={82} color="#123456" ariaLabel="ROR" />);
      expect(container.querySelector('svg')).toHaveAttribute('width', '82');
    });
  });

  describe('Image-based logo icons', () => {
    it('renders LogoTextIcon via next/image', () => {
      render(<LogoTextIcon ariaLabel="Episciences" />);
      expect(screen.getByAltText('Episciences')).toBeInTheDocument();
    });

    it('LogoTextIcon falls back to default alt text', () => {
      render(<LogoTextIcon />);
      expect(screen.getByAltText('Episciences logo')).toBeInTheDocument();
    });

    it('renders OrcidIcon via next/image', () => {
      render(<OrcidIcon ariaLabel="ORCID profile" />);
      expect(screen.getByAltText('ORCID profile')).toBeInTheDocument();
    });

    it('OrcidIcon falls back to default alt text', () => {
      render(<OrcidIcon />);
      expect(screen.getByAltText('ORCID iD')).toBeInTheDocument();
    });
  });

  describe('Social icons', () => {
    it.each([
      ['FacebookIcon', FacebookIcon],
      ['TwitterIcon', TwitterIcon],
      ['LinkedinIcon', LinkedinIcon],
      ['MailIcon', MailIcon],
      ['AtIcon', AtIcon],
      ['BlueskyIcon', BlueskyIcon],
      ['MastodonIcon', MastodonIcon],
      ['WhatsappIcon', WhatsappIcon],
    ])('%s renders with default and custom props', (_name, Icon) => {
      const { container } = render(<Icon size={20} color="#654321" ariaLabel="Social link" />);
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
      expect(svg).toHaveAttribute('width', '20');
      expect(svg).toHaveAttribute('aria-label', 'Social link');
      expect(svg).toHaveAttribute('role', 'img');
    });

    it.each([
      ['FacebookIcon', FacebookIcon],
      ['TwitterIcon', TwitterIcon],
      ['LinkedinIcon', LinkedinIcon],
      ['MailIcon', MailIcon],
      ['AtIcon', AtIcon],
      ['BlueskyIcon', BlueskyIcon],
      ['MastodonIcon', MastodonIcon],
      ['WhatsappIcon', WhatsappIcon],
    ])('%s is hidden from screen readers without ariaLabel', (_name, Icon) => {
      const { container } = render(<Icon />);
      expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
    });
  });
});
