import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import VolumeCard from '../VolumeCard';
import { RENDERING_MODE } from '@/utils/card';
import { VOLUME_TYPE } from '@/utils/volume';
import { IVolume } from '@/types/volume';

// Mock Link
vi.mock('@/components/Link/Link', () => ({
  Link: ({
    href,
    children,
    className,
    ...rest
  }: {
    href: string;
    children: React.ReactNode;
    className?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} className={className} {...rest}>
      {children}
    </a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} />
  ),
}));

// Mock icons
vi.mock('@/components/icons', () => ({
  FileGreyIcon: () => <span data-testid="file-icon" />,
  DownloadBlackIcon: () => <span data-testid="download-icon" />,
  CaretUpBlackIcon: () => <span data-testid="caret-up-icon" />,
  CaretDownBlackIcon: () => <span data-testid="caret-down-icon" />,
}));

// Mock MathJax
vi.mock('@/components/MathJax/MathJax', () => ({
  default: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.volumeCard.volume': 'Volume',
    'common.volumeCard.specialIssue': 'Special Issue',
    'common.volumeCard.proceeding': 'Proceedings',
    'common.articles': 'articles',
    'common.article': 'article',
    'common.about': 'About',
    'common.pdf': 'PDF',
  };
  return translations[key] || key;
});

const baseVolume: IVolume = {
  id: 42,
  num: '7',
  title: { en: 'English Volume Title', fr: 'Titre du volume en français' },
  year: 2024,
  articles: [{ id: 1 } as any, { id: 2 } as any],
  downloadLink: '/volumes/42/download',
};

describe('VolumeCard', () => {
  describe('LIST mode', () => {
    it('renders the volume number', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getAllByText(/Volume 7/).length).toBeGreaterThan(0);
    });

    it('renders the volume title in the requested language', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getByText('English Volume Title')).toBeInTheDocument();
    });

    it('renders the volume title in French', () => {
      render(
        <VolumeCard
          language="fr"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getByText('Titre du volume en français')).toBeInTheDocument();
    });

    it('renders the article count', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getByText(/2 articles/)).toBeInTheDocument();
    });

    it('renders singular article for single article', () => {
      const singleArticleVolume: IVolume = { ...baseVolume, articles: [{ id: 1 } as any] };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={singleArticleVolume}
        />
      );
      expect(screen.getByText(/1 article/)).toBeInTheDocument();
    });

    it('renders the year', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getByText('2024')).toBeInTheDocument();
    });

    it('renders download link when available', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      expect(screen.getByText('PDF')).toBeInTheDocument();
    });

    it('does not render download link when not available', () => {
      const noDownload: IVolume = { ...baseVolume, downloadLink: '' };
      render(
        <VolumeCard language="en" t={mockT as any} mode={RENDERING_MODE.LIST} volume={noDownload} />
      );
      expect(screen.queryByText('PDF')).not.toBeInTheDocument();
    });

    it('shows "Special Issue" label for special issue type', () => {
      const specialIssue: IVolume = { ...baseVolume, types: [VOLUME_TYPE.SPECIAL_ISSUE] };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={specialIssue}
        />
      );
      expect(screen.getAllByText(/Special Issue/).length).toBeGreaterThan(0);
    });

    it('shows "Proceedings" label for proceedings type', () => {
      const proceedings: IVolume = { ...baseVolume, types: [VOLUME_TYPE.PROCEEDINGS] };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={proceedings}
        />
      );
      expect(screen.getAllByText(/Proceedings/).length).toBeGreaterThan(0);
    });

    it('toggles description open/closed on click', async () => {
      const user = userEvent.setup();
      const volumeWithDesc: IVolume = {
        ...baseVolume,
        description: { en: 'A detailed description', fr: 'Une description détaillée' },
      };
      const { container } = render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithDesc}
        />
      );

      // Initially closed
      expect(
        container.querySelector('.volumeCard-content-description-title-closed')
      ).toBeInTheDocument();

      // Click to open
      await user.click(screen.getByRole('button', { name: /About/ }));
      expect(
        container.querySelector('.volumeCard-content-description-title-closed')
      ).not.toBeInTheDocument();

      // Click to close again
      await user.click(screen.getByRole('button', { name: /About/ }));
      expect(
        container.querySelector('.volumeCard-content-description-title-closed')
      ).toBeInTheDocument();
    });

    it('description toggle has aria-expanded="false" when collapsed', () => {
      const volumeWithDesc: IVolume = {
        ...baseVolume,
        description: { en: 'Description text', fr: 'Description' },
      };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithDesc}
        />
      );
      expect(screen.getByRole('button', { name: /About/ })).toHaveAttribute(
        'aria-expanded',
        'false'
      );
    });

    it('description toggle has aria-expanded="true" after opening', async () => {
      const user = userEvent.setup();
      const volumeWithDesc: IVolume = {
        ...baseVolume,
        description: { en: 'Description text', fr: 'Description' },
      };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithDesc}
        />
      );
      await user.click(screen.getByRole('button', { name: /About/ }));
      expect(screen.getByRole('button', { name: /About/ })).toHaveAttribute(
        'aria-expanded',
        'true'
      );
    });

    it('description toggle is keyboard accessible', async () => {
      const user = userEvent.setup();
      const volumeWithDesc: IVolume = {
        ...baseVolume,
        description: { en: 'Description text', fr: 'Description' },
      };
      const { container } = render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithDesc}
        />
      );

      const toggle = screen.getByRole('button', { name: /About/ });
      toggle.focus();
      await user.keyboard('{Enter}');

      expect(
        container.querySelector('.volumeCard-content-description-title-closed')
      ).not.toBeInTheDocument();
    });

    it('renders committee members when present', () => {
      const volumeWithCommittee: IVolume = {
        ...baseVolume,
        committee: [
          { uuid: '1', screenName: 'Alice Martin' },
          { uuid: '2', screenName: 'Bob Smith' },
        ],
      };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithCommittee}
        />
      );
      expect(screen.getByText('Alice Martin, Bob Smith')).toBeInTheDocument();
    });
  });

  describe('TILE mode', () => {
    it('renders the volume number in tile mode', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={baseVolume}
        />
      );
      expect(screen.getByText(/Volume 7/)).toBeInTheDocument();
    });

    it('renders tile cover image when tileImageURL is provided', () => {
      const volumeWithImage: IVolume = {
        ...baseVolume,
        tileImageURL: 'https://example.com/cover.jpg',
      };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={volumeWithImage}
        />
      );
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders fallback template when no tileImageURL', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={baseVolume}
          journalCode="jpe"
        />
      );
      // Fallback template shows journal code in uppercase
      expect(screen.getByText('JPE')).toBeInTheDocument();
    });

    it('uses journalCode prop for display', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={baseVolume}
          journalCode="test"
        />
      );
      expect(screen.getByText('TEST')).toBeInTheDocument();
    });

    it('renders year in tile mode', () => {
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={baseVolume}
        />
      );
      // Year appears in both the cover template and the tile text area
      expect(screen.getAllByText('2024').length).toBeGreaterThan(0);
    });
  });

  describe('accessibility', () => {
    it('should have no violations in list mode', async () => {
      const { container } = render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={baseVolume}
        />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('should have no violations in tile mode', async () => {
      const { container } = render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.TILE}
          volume={baseVolume}
        />
      );
      const results = await checkA11y(container);
      expect(results).toHaveNoViolations();
    });

    it('description toggle has role="button" and tabIndex=0', () => {
      const volumeWithDesc: IVolume = {
        ...baseVolume,
        description: { en: 'Desc', fr: 'Desc' },
      };
      render(
        <VolumeCard
          language="en"
          t={mockT as any}
          mode={RENDERING_MODE.LIST}
          volume={volumeWithDesc}
        />
      );
      const toggle = screen.getByRole('button', { name: /About/ });
      expect(toggle).toHaveAttribute('tabIndex', '0');
    });
  });
});
