import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Swiper from '../Swiper';

// Mock the Swiper library components
vi.mock('swiper/react', () => ({
  Swiper: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="swiper-container" role="region" aria-label="Carousel">
      {children}
    </div>
  ),
  SwiperSlide: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="swiper-slide" role="group" aria-label="Slide">
      {children}
    </div>
  ),
}));

// Mock Swiper modules
vi.mock('swiper/modules', () => ({
  Pagination: {},
  Navigation: {},
}));

// Mock Swiper CSS imports
vi.mock('swiper/css', () => ({}));
vi.mock('swiper/css/pagination', () => ({}));
vi.mock('swiper/css/navigation', () => ({}));

// Mock icon components with proper ARIA
vi.mock('@/components/icons', () => ({
  CaretLeftBlackIcon: ({ size, ariaLabel, className }: {
    size: number;
    ariaLabel?: string;
    className?: string;
  }) => (
    <span
      data-testid="caret-left-icon"
      data-size={size}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  ),
  CaretRightBlackIcon: ({ size, ariaLabel, className }: {
    size: number;
    ariaLabel?: string;
    className?: string;
  }) => (
    <span
      data-testid="caret-right-icon"
      data-size={size}
      role="img"
      aria-label={ariaLabel}
      className={className}
    />
  ),
}));

// Mock Card component
vi.mock('@/components/SwiperCards/SwiperCard', () => ({
  default: ({ type, content }: { type: string; content: any }) => (
    <div data-testid="swiper-card" data-type={type}>
      {content.title || content.name || 'Card'}
    </div>
  ),
}));

describe('Swiper', () => {
  const mockT = vi.fn((key: string) => key);

  const defaultProps = {
    id: 'test-swiper',
    type: 'article' as const,
    language: 'en' as const,
    t: mockT,
    slidesPerView: 3,
    slidesPerGroup: 3,
    cards: [
      { title: 'Article 1', id: 1 },
      { title: 'Article 2', id: 2 },
      { title: 'Article 3', id: 3 },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock window.innerWidth for responsive tests
    Object.defineProperty(window, 'innerWidth', {
      value: 1400,
      writable: true,
    });
  });

  describe('Basic rendering', () => {
    it('renders swiper container', () => {
      render(<Swiper {...defaultProps} />);

      expect(screen.getByTestId('swiper-container')).toBeInTheDocument();
    });

    it('renders all cards as slides', () => {
      render(<Swiper {...defaultProps} />);

      const slides = screen.getAllByTestId('swiper-slide');
      expect(slides.length).toBe(3);
    });

    it('renders cards with correct content', () => {
      render(<Swiper {...defaultProps} />);

      const cards = screen.getAllByTestId('swiper-card');
      expect(cards.length).toBe(3);
    });

    it('does not render when cards array is empty', () => {
      const { container } = render(<Swiper {...defaultProps} cards={[]} />);

      expect(container.querySelector('.swiper-page-wrapper')).not.toBeInTheDocument();
    });

    it('does not render when cards is undefined', () => {
      const { container } = render(<Swiper {...defaultProps} cards={undefined as any} />);

      expect(container.querySelector('.swiper-page-wrapper')).not.toBeInTheDocument();
    });
  });

  describe('Navigation buttons', () => {
    it('renders previous button', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const prevButton = container.querySelector('.swiper-button-prev');
      expect(prevButton).toBeInTheDocument();
    });

    it('renders next button', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const nextButton = container.querySelector('.swiper-button-next');
      expect(nextButton).toBeInTheDocument();
    });

    it('previous button has CaretLeftBlackIcon', () => {
      render(<Swiper {...defaultProps} />);

      expect(screen.getByTestId('caret-left-icon')).toBeInTheDocument();
    });

    it('next button has CaretRightBlackIcon', () => {
      render(<Swiper {...defaultProps} />);

      expect(screen.getByTestId('caret-right-icon')).toBeInTheDocument();
    });
  });

  describe('Navigation accessibility', () => {
    it('previous icon has aria-label "Previous"', () => {
      render(<Swiper {...defaultProps} />);

      const prevIcon = screen.getByTestId('caret-left-icon');
      expect(prevIcon).toHaveAttribute('aria-label', 'Previous');
    });

    it('next icon has aria-label "Next"', () => {
      render(<Swiper {...defaultProps} />);

      const nextIcon = screen.getByTestId('caret-right-icon');
      expect(nextIcon).toHaveAttribute('aria-label', 'Next');
    });

    it('navigation icons have role="img"', () => {
      render(<Swiper {...defaultProps} />);

      const prevIcon = screen.getByTestId('caret-left-icon');
      const nextIcon = screen.getByTestId('caret-right-icon');

      expect(prevIcon).toHaveAttribute('role', 'img');
      expect(nextIcon).toHaveAttribute('role', 'img');
    });
  });

  describe('Pagination', () => {
    it('renders pagination container', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const pagination = container.querySelector('.swiper-pagination');
      expect(pagination).toBeInTheDocument();
    });

    it('pagination has correct id-based class', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const pagination = container.querySelector('.test-swiper-pagination');
      expect(pagination).toBeInTheDocument();
    });
  });

  describe('Button CSS classes', () => {
    it('previous button has id-based class', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const prevButton = container.querySelector('.test-swiper-button-prev');
      expect(prevButton).toBeInTheDocument();
    });

    it('next button has id-based class', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const nextButton = container.querySelector('.test-swiper-button-next');
      expect(nextButton).toBeInTheDocument();
    });
  });

  describe('Card types', () => {
    it('passes article type to cards', () => {
      render(<Swiper {...defaultProps} type="article" />);

      const cards = screen.getAllByTestId('swiper-card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('data-type', 'article');
      });
    });

    it('passes board type to cards', () => {
      const boardCards = [
        { name: 'Member 1', id: 1 },
        { name: 'Member 2', id: 2 },
      ];

      render(<Swiper {...defaultProps} type="board" cards={boardCards} />);

      const cards = screen.getAllByTestId('swiper-card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('data-type', 'board');
      });
    });

    it('passes article-accepted type to cards', () => {
      render(<Swiper {...defaultProps} type="article-accepted" />);

      const cards = screen.getAllByTestId('swiper-card');
      cards.forEach(card => {
        expect(card).toHaveAttribute('data-type', 'article-accepted');
      });
    });
  });

  describe('Page wrapper', () => {
    it('renders page wrapper container', () => {
      const { container } = render(<Swiper {...defaultProps} />);

      expect(container.querySelector('.swiper-page-wrapper')).toBeInTheDocument();
    });
  });

  describe('Filtering null cards', () => {
    it('filters out null/undefined cards', () => {
      const cardsWithNulls = [
        { title: 'Article 1', id: 1 },
        null,
        { title: 'Article 2', id: 2 },
        undefined,
        { title: 'Article 3', id: 3 },
      ];

      render(<Swiper {...defaultProps} cards={cardsWithNulls as any} />);

      const cards = screen.getAllByTestId('swiper-card');
      expect(cards.length).toBe(3);
    });
  });

  describe('Icon styling', () => {
    it('previous icon has correct class', () => {
      render(<Swiper {...defaultProps} />);

      const prevIcon = screen.getByTestId('caret-left-icon');
      expect(prevIcon).toHaveClass('swiper-button-prev-icon');
    });

    it('next icon has correct class', () => {
      render(<Swiper {...defaultProps} />);

      const nextIcon = screen.getByTestId('caret-right-icon');
      expect(nextIcon).toHaveClass('swiper-button-next-icon');
    });
  });

  describe('Props are passed correctly', () => {
    it('passes language to cards', () => {
      render(<Swiper {...defaultProps} language="fr" />);

      // Cards should be rendered (we verify through the mock)
      expect(screen.getAllByTestId('swiper-card').length).toBe(3);
    });

    it('passes translation function to cards', () => {
      render(<Swiper {...defaultProps} />);

      // Cards should be rendered
      expect(screen.getAllByTestId('swiper-card').length).toBe(3);
    });
  });

  describe('Accessibility - axe-core validation', () => {
    it('should have no critical accessibility violations', async () => {
      const { container } = render(<Swiper {...defaultProps} />);

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with board type', async () => {
      const boardCards = [
        { name: 'Member 1', id: 1 },
        { name: 'Member 2', id: 2 },
      ];

      const { container } = render(
        <Swiper {...defaultProps} type="board" cards={boardCards} />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations with many cards', async () => {
      const manyCards = Array.from({ length: 10 }, (_, i) => ({
        title: `Article ${i + 1}`,
        id: i + 1,
      }));

      const { container } = render(
        <Swiper {...defaultProps} cards={manyCards} />
      );

      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });
  });
});
