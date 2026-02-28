import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import NewsCard from '../NewsCard';
import { RENDERING_MODE } from '@/utils/card';
import { INews } from '@/types/news';

// Mock Link
vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    className,
    target,
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    target?: string;
  }) => (
    <a href={href} className={className} target={target}>
      {children}
    </a>
  ),
}));

// Mock icons
vi.mock('@/components/icons', () => ({
  ExternalLinkBlackIcon: () => <span data-testid="external-link-icon" />,
}));

// Mock formatDate
vi.mock('@/utils/date', () => ({
  formatDate: vi.fn((_date: string, _lang: string) => 'Jan 1, 2024'),
}));

// Mock generateIdFromText (used by cardId)
vi.mock('@/utils/markdown', () => ({
  generateIdFromText: (text: string) => `id-${text}`,
}));

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.readMore': 'Read more',
    'common.readLess': 'Read less',
    'common.read': 'Read',
    'common.loading': 'Loading...',
  };
  return translations[key] || key;
});

const baseNews: INews = {
  id: 10,
  title: { en: 'Important News', fr: 'Actualité importante' },
  publicationDate: '2024-01-01',
  author: 'Editor',
};

const newsWithContent: INews = {
  ...baseNews,
  content: { en: 'This is the news content.', fr: 'Voici le contenu.' },
};

const newsWithLink: INews = {
  ...baseNews,
  link: 'https://example.com/news',
};

describe('NewsCard', () => {
  describe('LIST mode (default rendering)', () => {
    it('renders the publication date', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
    });

    it('renders the title in the requested language', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('Important News')).toBeInTheDocument();
    });

    it('renders the title in French', () => {
      render(
        <NewsCard
          language="fr"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('Actualité importante')).toBeInTheDocument();
    });

    it('renders content when available', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsWithContent}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('This is the news content.')).toBeInTheDocument();
    });

    it('renders external link when news has a link', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsWithLink}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('Read')).toBeInTheDocument();
    });

    it('does not render external link when news has no link', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.queryByText('Read')).not.toBeInTheDocument();
    });
  });

  describe('content truncation', () => {
    it('shows Read more button for content longer than 400 characters', () => {
      const longContent = 'A'.repeat(401);
      const newsLong: INews = { ...baseNews, content: { en: longContent, fr: '' } };
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsLong}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByRole('button', { name: /Read more/ })).toBeInTheDocument();
    });

    it('does not show Read more for short content', () => {
      const shortContent = 'Short content';
      const newsShort: INews = { ...baseNews, content: { en: shortContent, fr: '' } };
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsShort}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.queryByRole('button', { name: /Read more/ })).not.toBeInTheDocument();
    });

    it('toggles to "Read less" after clicking "Read more"', async () => {
      const user = userEvent.setup();
      const longContent = 'B'.repeat(401);
      const newsLong: INews = { ...baseNews, content: { en: longContent, fr: '' } };
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsLong}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      await user.click(screen.getByRole('button', { name: /Read more/ }));
      expect(screen.getByRole('button', { name: /Read less/ })).toBeInTheDocument();
    });
  });

  describe('TILE mode', () => {
    it('renders title in TILE mode', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('Important News')).toBeInTheDocument();
    });

    it('applies blur class when blurCard is true', () => {
      const { container } = render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={true}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(container.querySelector('.newsCard-tile-blur')).toBeInTheDocument();
    });

    it('does not apply blur class when blurCard is false', () => {
      const { container } = render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(container.querySelector('.newsCard-tile-blur')).not.toBeInTheDocument();
    });

    it('calls setFullNewsIndexCallback when tile is clicked', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={callback}
        />
      );
      const card = screen.getByRole('button');
      await user.click(card);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    it('renders full card expanded content when fullCard is true', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={newsWithContent}
          fullCard={true}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(screen.getByText('This is the news content.')).toBeInTheDocument();
    });

    it('applies newsCard-tile-full class when fullCard is true', () => {
      const { container } = render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={true}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      expect(container.querySelector('.newsCard-tile-full')).toBeInTheDocument();
    });
  });

  describe('accessibility', () => {
    it('should have no violations in list mode', async () => {
      const { container } = render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          news={newsWithContent}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('tile card has role="button" and tabIndex=0', () => {
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={vi.fn()}
        />
      );
      const card = screen.getByRole('button');
      expect(card).toHaveAttribute('tabIndex', '0');
    });

    it('tile card is keyboard accessible via Enter', async () => {
      const user = userEvent.setup();
      const callback = vi.fn();
      render(
        <NewsCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          news={baseNews}
          fullCard={false}
          blurCard={false}
          setFullNewsIndexCallback={callback}
        />
      );
      const card = screen.getByRole('button');
      card.focus();
      await user.keyboard('{Enter}');
      expect(callback).toHaveBeenCalled();
    });
  });
});
