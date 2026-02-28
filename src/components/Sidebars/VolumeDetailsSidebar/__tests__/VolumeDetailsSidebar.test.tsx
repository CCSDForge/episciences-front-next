import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import VolumeDetailsSidebar from '../VolumeDetailsSidebar';
import { VOLUME_TYPE } from '@/utils/volume';

// --- Mocks ---

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, target, className }: any) => (
    <a href={href} target={target} className={className}>
      {children}
    </a>
  ),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt, className }: any) => <img src={src} alt={alt} className={className} />,
}));

vi.mock('@/components/icons', () => ({
  DownloadBlackIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
}));

vi.mock('@/config/paths', () => ({
  PATHS: { volumes: 'volumes' },
}));

vi.mock('@/utils/content-fallback', () => ({
  getLocalizedContent: (obj: Record<string, string>, lang: string) => ({
    value: obj[lang] || obj['en'] || '',
    isOriginalLanguage: true,
    isAvailable: true,
  }),
}));

vi.mock('@/utils/image-placeholders', () => ({
  VOLUME_COVER_BLUR: 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==',
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const t: Record<string, string> = {
    'common.volumeCard.volume': 'Volume',
    'common.volumeCard.specialIssue': 'Special Issue',
    'common.volumeCard.proceeding': 'Proceeding',
    'common.articles': 'articles',
    'common.article': 'article',
    'pages.volumeDetails.actions.downloadAll': 'Download all',
    'pages.volumeDetails.relatedVolumes.volumes': 'Other Volumes',
    'pages.volumeDetails.relatedVolumes.specialIssues': 'Other Special Issues',
    'pages.volumeDetails.relatedVolumes.proceedings': 'Other Proceedings',
  };
  return t[key] ?? key;
});

const baseVolume: any = {
  id: 7,
  num: 2,
  year: 2024,
  title: { en: 'Volume Title', fr: 'Titre du volume' },
  types: [],
  downloadLink: 'https://example.com/volume.pdf',
};

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  volume: baseVolume,
  articles: [],
  relatedVolumes: [],
};

// --- Tests ---

describe('VolumeDetailsSidebar', () => {
  beforeEach(() => vi.clearAllMocks());

  // ─────────────────────────────────────────────────────────────────────────
  // Cover image vs template
  // ─────────────────────────────────────────────────────────────────────────
  describe('Cover image vs template', () => {
    it('renders <img> when tileImageURL is present', () => {
      const volume = { ...baseVolume, tileImageURL: 'https://example.com/cover.jpg' };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByRole('img')).toBeInTheDocument();
    });

    it('img src is the tileImageURL', () => {
      const volume = { ...baseVolume, tileImageURL: 'https://example.com/cover.jpg' };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByRole('img')).toHaveAttribute('src', 'https://example.com/cover.jpg');
    });

    it('renders template when no tileImageURL', () => {
      render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(screen.queryByRole('img')).not.toBeInTheDocument();
      const { container } = render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(container.querySelector('.volumeDetailsSidebar-template')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Journal code
  // ─────────────────────────────────────────────────────────────────────────
  describe('Journal code display', () => {
    it('renders journal code in uppercase from journalId prop', () => {
      render(<VolumeDetailsSidebar {...defaultProps} journalId="myjournal" />);
      expect(screen.getByText('MYJOURNAL')).toBeInTheDocument();
    });

    it('renders journal code in uppercase from currentJournal.code', () => {
      render(
        <VolumeDetailsSidebar
          {...defaultProps}
          currentJournal={{ code: 'epijrn' } as any}
        />
      );
      expect(screen.getByText('EPIJRN')).toBeInTheDocument();
    });

    it('journalId takes precedence over currentJournal.code', () => {
      render(
        <VolumeDetailsSidebar
          {...defaultProps}
          journalId="primary"
          currentJournal={{ code: 'secondary' } as any}
        />
      );
      expect(screen.getByText('PRIMARY')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Volume type labels
  // ─────────────────────────────────────────────────────────────────────────
  describe('Volume type label in template', () => {
    it('renders "Volume" label for regular volume', () => {
      render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Volume')).toBeInTheDocument();
    });

    it('renders "Special Issue" label for special issue', () => {
      const volume = { ...baseVolume, types: [VOLUME_TYPE.SPECIAL_ISSUE] };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByText('Special Issue')).toBeInTheDocument();
    });

    it('renders "Proceeding" label for proceedings', () => {
      const volume = { ...baseVolume, types: [VOLUME_TYPE.PROCEEDINGS] };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByText('Proceeding')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Volume number / conference acronym
  // ─────────────────────────────────────────────────────────────────────────
  describe('Volume number display', () => {
    it('renders volume num for regular volume', () => {
      render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders conference acronym+number for proceedings with settingsProceeding', () => {
      const volume = {
        ...baseVolume,
        types: [VOLUME_TYPE.PROCEEDINGS],
        settingsProceeding: [
          { setting: 'conference_acronym', value: 'CONF' },
          { setting: 'conference_number', value: '42' },
        ],
      };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByText('CONF 42')).toBeInTheDocument();
    });

    it('falls back to num when settingsProceeding is missing fields', () => {
      const volume = {
        ...baseVolume,
        types: [VOLUME_TYPE.PROCEEDINGS],
        settingsProceeding: [{ setting: 'conference_acronym', value: 'CONF' }],
      };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByText('2')).toBeInTheDocument();
    });

    it('renders volume year', () => {
      render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('2024')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Article count
  // ─────────────────────────────────────────────────────────────────────────
  describe('Article count', () => {
    it('shows plural when articles prop has multiple articles', () => {
      const articles = [{ id: 1 }, { id: 2 }, { id: 3 }] as any[];
      render(<VolumeDetailsSidebar {...defaultProps} articles={articles} />);
      expect(screen.getByText('3 articles')).toBeInTheDocument();
    });

    it('shows singular when articles prop has one article', () => {
      const articles = [{ id: 1 }] as any[];
      render(<VolumeDetailsSidebar {...defaultProps} articles={articles} />);
      expect(screen.getByText('1 article')).toBeInTheDocument();
    });

    it('falls back to volume.articles when articles prop is empty', () => {
      const volume = { ...baseVolume, articles: [{ id: 10 }, { id: 11 }] };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} articles={[]} />);
      expect(screen.getByText('2 articles')).toBeInTheDocument();
    });

    it('shows 0 articles when both sources are empty', () => {
      render(<VolumeDetailsSidebar {...defaultProps} articles={[]} />);
      expect(screen.getByText('0 article')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Download link
  // ─────────────────────────────────────────────────────────────────────────
  describe('Download link', () => {
    it('renders download link when volume is present', () => {
      render(<VolumeDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Download all')).toBeInTheDocument();
    });

    it('does not render download link when volume is absent', () => {
      render(<VolumeDetailsSidebar {...defaultProps} volume={undefined} />);
      expect(screen.queryByText('Download all')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata files
  // ─────────────────────────────────────────────────────────────────────────
  describe('Metadata files', () => {
    it('renders metadata link for valid metadata', () => {
      const volume = {
        ...baseVolume,
        metadatas: [{ file: 'index.pdf', title: { en: 'Index' } }],
      };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.getByText('Index')).toBeInTheDocument();
    });

    it('excludes "tile" metadata', () => {
      const volume = {
        ...baseVolume,
        metadatas: [
          { file: 'cover.jpg', title: { en: 'Tile' } },
          { file: 'index.pdf', title: { en: 'Index' } },
        ],
      };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.queryByText('Tile')).not.toBeInTheDocument();
      expect(screen.getByText('Index')).toBeInTheDocument();
    });

    it('excludes metadata without a file', () => {
      const volume = {
        ...baseVolume,
        metadatas: [{ file: '', title: { en: 'Missing' } }],
      };
      render(<VolumeDetailsSidebar {...defaultProps} volume={volume} />);
      expect(screen.queryByText('Missing')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Related volumes
  // ─────────────────────────────────────────────────────────────────────────
  describe('Related volumes', () => {
    const relatedVolumes: any[] = [
      { id: 7, title: { en: 'Current Volume' } },
      { id: 8, title: { en: 'Other Volume' } },
    ];

    it('does not render related volumes section when list is empty', () => {
      const { container } = render(<VolumeDetailsSidebar {...defaultProps} relatedVolumes={[]} />);
      expect(container.querySelector('.volumeDetailsSidebar-relatedVolumes')).toBeNull();
    });

    it('renders related volumes when list is not empty', () => {
      render(<VolumeDetailsSidebar {...defaultProps} relatedVolumes={relatedVolumes} />);
      expect(screen.getByText('Current Volume')).toBeInTheDocument();
      expect(screen.getByText('Other Volume')).toBeInTheDocument();
    });

    it('applies current class to the volume matching volume.id', () => {
      const { container } = render(
        <VolumeDetailsSidebar {...defaultProps} relatedVolumes={relatedVolumes} />
      );
      const currentLink = container.querySelector(
        '.volumeDetailsSidebar-relatedVolumes-volumes-list-volume-current'
      );
      expect(currentLink).toBeInTheDocument();
      expect(currentLink?.textContent).toBe('Current Volume');
    });

    it('renders "Other Volumes" title for regular volumes', () => {
      render(<VolumeDetailsSidebar {...defaultProps} relatedVolumes={relatedVolumes} />);
      expect(screen.getByText('Other Volumes')).toBeInTheDocument();
    });

    it('renders "Other Special Issues" title for special issues', () => {
      const volume = { ...baseVolume, types: [VOLUME_TYPE.SPECIAL_ISSUE] };
      render(
        <VolumeDetailsSidebar {...defaultProps} volume={volume} relatedVolumes={relatedVolumes} />
      );
      expect(screen.getByText('Other Special Issues')).toBeInTheDocument();
    });

    it('renders "Other Proceedings" title for proceedings', () => {
      const volume = { ...baseVolume, types: [VOLUME_TYPE.PROCEEDINGS] };
      render(
        <VolumeDetailsSidebar {...defaultProps} volume={volume} relatedVolumes={relatedVolumes} />
      );
      expect(screen.getByText('Other Proceedings')).toBeInTheDocument();
    });

    it('related volume links have correct href', () => {
      render(<VolumeDetailsSidebar {...defaultProps} relatedVolumes={relatedVolumes} />);
      const links = screen.getAllByRole('link');
      const otherVolumeLink = links.find(l => l.textContent === 'Other Volume');
      expect(otherVolumeLink).toHaveAttribute('href', 'volumes/8');
    });
  });
});
