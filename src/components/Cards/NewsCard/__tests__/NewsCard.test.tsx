import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import NewsListCard from '../NewsListCard';
import NewsTileCard from '../NewsTileCard';
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

describe('NewsListCard', () => {
  it('renders the publication date', () => {
    render(<NewsListCard language="en" t={mockT as any} news={baseNews} />);
    expect(screen.getByText('Jan 1, 2024')).toBeInTheDocument();
  });

  it('renders the title in the requested language', () => {
    render(<NewsListCard language="en" t={mockT as any} news={baseNews} />);
    expect(screen.getByText('Important News')).toBeInTheDocument();
  });

  it('renders the title in French', () => {
    render(<NewsListCard language="fr" t={mockT as any} news={baseNews} />);
    expect(screen.getByText('Actualité importante')).toBeInTheDocument();
  });

  it('renders content when available', () => {
    render(<NewsListCard language="en" t={mockT as any} news={newsWithContent} />);
    expect(screen.getByText('This is the news content.')).toBeInTheDocument();
  });

  it('renders external link when news has a link', () => {
    render(<NewsListCard language="en" t={mockT as any} news={newsWithLink} />);
    expect(screen.getByText('Read')).toBeInTheDocument();
  });

  it('does not render external link when news has no link', () => {
    render(<NewsListCard language="en" t={mockT as any} news={baseNews} />);
    expect(screen.queryByText('Read')).not.toBeInTheDocument();
  });

  it('shows Read more button for content longer than 400 characters', () => {
    const longContent = 'A'.repeat(401);
    const newsLong: INews = { ...baseNews, content: { en: longContent, fr: '' } };
    render(<NewsListCard language="en" t={mockT as any} news={newsLong} />);
    expect(screen.getByRole('button', { name: /Read more/ })).toBeInTheDocument();
  });

  it('does not show Read more for short content', () => {
    const shortContent = 'Short content';
    const newsShort: INews = { ...baseNews, content: { en: shortContent, fr: '' } };
    render(<NewsListCard language="en" t={mockT as any} news={newsShort} />);
    expect(screen.queryByRole('button', { name: /Read more/ })).not.toBeInTheDocument();
  });

  it('toggles to "Read less" after clicking "Read more"', async () => {
    const user = userEvent.setup();
    const longContent = 'B'.repeat(401);
    const newsLong: INews = { ...baseNews, content: { en: longContent, fr: '' } };
    render(<NewsListCard language="en" t={mockT as any} news={newsLong} />);
    await user.click(screen.getByRole('button', { name: /Read more/ }));
    expect(screen.getByRole('button', { name: /Read less/ })).toBeInTheDocument();
  });

  it('should have no a11y violations', async () => {
    const { container } = render(
      <NewsListCard language="en" t={mockT as any} news={newsWithContent} />
    );
    const results = await checkA11y(container);
    expect(results).toHaveNoViolations();
  });
});

describe('NewsTileCard', () => {
  it('renders title in default state', () => {
    render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="default"
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('Important News')).toBeInTheDocument();
  });

  it('applies blur class when state is blurred', () => {
    const { container } = render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="blurred"
        onToggle={vi.fn()}
      />
    );
    expect(container.querySelector('.newsCard-tile-blur')).toBeInTheDocument();
  });

  it('does not apply blur class when state is default', () => {
    const { container } = render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="default"
        onToggle={vi.fn()}
      />
    );
    expect(container.querySelector('.newsCard-tile-blur')).not.toBeInTheDocument();
  });

  it('calls onToggle when tile is clicked', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="default"
        onToggle={onToggle}
      />
    );
    await user.click(screen.getByRole('button'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('renders expanded content when state is expanded', () => {
    render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={newsWithContent}
        state="expanded"
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('This is the news content.')).toBeInTheDocument();
  });

  it('applies newsCard-tile-full class when state is expanded', () => {
    const { container } = render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="expanded"
        onToggle={vi.fn()}
      />
    );
    expect(container.querySelector('.newsCard-tile-full')).toBeInTheDocument();
  });

  it('tile card has role="button" and tabIndex=0', () => {
    render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="default"
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByRole('button')).toHaveAttribute('tabIndex', '0');
  });

  it('tile card is keyboard accessible via Enter', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(
      <NewsTileCard
        language="en"
        t={mockT as any}
        news={baseNews}
        state="default"
        onToggle={onToggle}
      />
    );
    const card = screen.getByRole('button');
    card.focus();
    await user.keyboard('{Enter}');
    expect(onToggle).toHaveBeenCalled();
  });
});
