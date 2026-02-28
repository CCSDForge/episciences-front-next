import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticleDetailsSidebar from '../ArticleDetailsSidebar';
import { VOLUME_TYPE } from '@/utils/volume';

// --- Mocks ---

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) => selector({ journalReducer: { currentJournal: { code: 'myjournal' } } }),
}));

vi.mock('@/components/Link/Link', () => ({
  Link: ({ href, children, className, target }: any) => (
    <a href={href} className={className} target={target}>
      {children}
    </a>
  ),
}));

vi.mock('@/components/icons', () => ({
  ExternalLinkBlackIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  DownloadBlackIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  QuoteBlackIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  ShareIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  MailIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  FacebookIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  TwitterIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  LinkedinIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  CaretUpGreyIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
  CaretDownGreyIcon: ({ ariaLabel }: any) => <span aria-label={ariaLabel} />,
}));

vi.mock('react-share', () => ({
  EmailShareButton: ({ children }: any) => <button data-testid="email-share">{children}</button>,
  FacebookShareButton: ({ children }: any) => <button data-testid="fb-share">{children}</button>,
  TwitterShareButton: ({ children }: any) => <button data-testid="tw-share">{children}</button>,
  LinkedinShareButton: ({ children }: any) => <button data-testid="li-share">{children}</button>,
}));

const mockCopyToClipboardCitation = vi.fn();
const mockGetLicenseLabelInfo = vi.fn();
const mockGetMetadataTypes = vi.fn();
vi.mock('@/utils/article', () => ({
  METADATA_TYPE: { TEI: 'tei', DC: 'dc', BIBTEX: 'bib' },
  copyToClipboardCitation: (...args: any[]) => mockCopyToClipboardCitation(...args),
  getLicenseLabelInfo: (...args: any[]) => mockGetLicenseLabelInfo(...args),
  getMetadataTypes: () => mockGetMetadataTypes(),
}));

vi.mock('@/services/article', () => ({
  fetchArticleMetadata: vi.fn().mockResolvedValue('BibTeX content'),
}));

vi.mock('@/utils/toast', () => ({
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/utils/date', () => ({
  formatDate: (_date: string, _lang: string) => '01/01/2024',
}));

vi.mock('@/utils/keyboard', () => ({
  handleKeyboardClick: (e: KeyboardEvent, fn: () => void) => {
    if (e.key === 'Enter' || e.key === ' ') fn();
  },
}));

vi.mock('@/config/paths', () => ({
  PATHS: { articles: 'articles', volumes: 'volumes' },
}));

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const t: Record<string, string> = {
    'common.publicationDetails': 'Publication Details',
    'common.submittedOn': 'Submitted on',
    'common.acceptedOn': 'Accepted on',
    'common.publishedOn': 'Published on',
    'common.lastModifiedOn': 'Last modified on',
    'common.doi': 'DOI',
    'pages.articleDetails.actions.download': 'Download PDF',
    'pages.articleDetails.actions.openOn': 'Open on',
    'pages.articleDetails.actions.cite': 'Cite',
    'pages.articleDetails.actions.metadata': 'Metadata',
    'pages.articleDetails.actions.share.text': 'Share',
    'pages.articleDetails.license': 'License',
    'pages.articleDetails.funding.title': 'Funding',
    'pages.articleDetails.volumeDetails.title': 'Volume',
    'pages.articleDetails.volumeDetails.specialIssue': 'Special Issue',
    'pages.articleDetails.volumeDetails.proceeding': 'Proceeding',
  };
  return t[key] ?? key;
});

const baseArticle: any = {
  id: 42,
  pdfLink: 'https://example.com/article.pdf',
  docLink: 'https://hal.science/hal-001',
  repositoryName: 'HAL',
  doi: '10.1234/test',
  submissionDate: '2023-10-01',
  acceptanceDate: '2023-11-01',
  publicationDate: '2024-01-01',
  modificationDate: '2024-01-15',
};

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  article: baseArticle,
  citations: [],
  relatedVolume: undefined,
};

// --- Tests ---

describe('ArticleDetailsSidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetMetadataTypes.mockReturnValue([]);
    mockGetLicenseLabelInfo.mockReturnValue(null);
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Rendering basics
  // ─────────────────────────────────────────────────────────────────────────
  describe('Rendering basics', () => {
    it('renders the sidebar container', () => {
      const { container } = render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(container.querySelector('.articleDetailsSidebar')).toBeInTheDocument();
    });

    it('renders the links section', () => {
      const { container } = render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(container.querySelector('.articleDetailsSidebar-links')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // PDF link
  // ─────────────────────────────────────────────────────────────────────────
  describe('PDF link', () => {
    it('renders download link when pdfLink is present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Download PDF')).toBeInTheDocument();
    });

    it('download link href points to article download route', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      const link = screen.getByText('Download PDF').closest('a');
      expect(link).toHaveAttribute('href', '/articles/42/download');
    });

    it('does not render download link when pdfLink is absent', () => {
      const article = { ...baseArticle, pdfLink: undefined };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('Download PDF')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Doc link
  // ─────────────────────────────────────────────────────────────────────────
  describe('Doc link', () => {
    it('renders "Open on <repo>" when docLink is present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Open on HAL')).toBeInTheDocument();
    });

    it('does not render doc link when docLink is absent', () => {
      const article = { ...baseArticle, docLink: undefined };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText(/Open on/)).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Citations dropdown
  // ─────────────────────────────────────────────────────────────────────────
  describe('Citations dropdown', () => {
    const citations = [
      { key: 'BibTeX', value: '@article{test}' },
      { key: 'APA', value: 'Author (2024).' },
    ] as any[];

    it('does not render cite button when citations array is empty', () => {
      render(<ArticleDetailsSidebar {...defaultProps} citations={[]} />);
      expect(screen.queryByText('Cite')).not.toBeInTheDocument();
    });

    it('renders cite button when citations are provided', () => {
      render(<ArticleDetailsSidebar {...defaultProps} citations={citations} />);
      expect(screen.getByText('Cite')).toBeInTheDocument();
    });

    it('renders citation format items in dropdown', () => {
      render(<ArticleDetailsSidebar {...defaultProps} citations={citations} />);
      expect(screen.getByText('BibTeX')).toBeInTheDocument();
      expect(screen.getByText('APA')).toBeInTheDocument();
    });

    it('clicking cite button toggles dropdown visibility', () => {
      const { container } = render(<ArticleDetailsSidebar {...defaultProps} citations={citations} />);
      const citeButton = screen.getByText('Cite').closest('[role="button"]')!;

      // Initially not displayed
      expect(container.querySelector('.articleDetailsSidebar-links-link-modal-content-displayed')).toBeNull();

      fireEvent.click(citeButton);
      expect(container.querySelector('.articleDetailsSidebar-links-link-modal-content-displayed')).toBeInTheDocument();
    });

    it('clicking a citation format calls copyToClipboardCitation', () => {
      render(<ArticleDetailsSidebar {...defaultProps} citations={citations} />);
      // Open the dropdown first
      const citeButton = screen.getByText('Cite').closest('[role="button"]')!;
      fireEvent.click(citeButton);

      // Click on BibTeX
      const bibtexItem = screen.getByText('BibTeX');
      fireEvent.click(bibtexItem);
      expect(mockCopyToClipboardCitation).toHaveBeenCalledWith(citations[0], mockT);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Metadata dropdown
  // ─────────────────────────────────────────────────────────────────────────
  describe('Metadata dropdown', () => {
    it('does not render metadata button when getMetadataTypes returns empty', () => {
      mockGetMetadataTypes.mockReturnValue([]);
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.queryByText('Metadata')).not.toBeInTheDocument();
    });

    it('renders metadata button when getMetadataTypes returns items', () => {
      mockGetMetadataTypes.mockReturnValue([{ type: 'bib', label: 'BibTeX' }]);
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Metadata')).toBeInTheDocument();
    });

    it('renders metadata format items in dropdown', () => {
      mockGetMetadataTypes.mockReturnValue([
        { type: 'bib', label: 'BibTeX' },
        { type: 'dc', label: 'Dublin Core' },
      ]);
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('BibTeX')).toBeInTheDocument();
      expect(screen.getByText('Dublin Core')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Share dropdown
  // ─────────────────────────────────────────────────────────────────────────
  describe('Share dropdown', () => {
    it('always renders the share button', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Share')).toBeInTheDocument();
    });

    it('renders all share platform buttons', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByTestId('email-share')).toBeInTheDocument();
      expect(screen.getByTestId('fb-share')).toBeInTheDocument();
      expect(screen.getByTestId('tw-share')).toBeInTheDocument();
      expect(screen.getByTestId('li-share')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Publication details
  // ─────────────────────────────────────────────────────────────────────────
  describe('Publication details', () => {
    it('renders the publication details section title', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Publication Details')).toBeInTheDocument();
    });

    it('shows submission date when present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Submitted on')).toBeInTheDocument();
    });

    it('shows acceptance date when present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Accepted on')).toBeInTheDocument();
    });

    it('shows publication date when present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Published on')).toBeInTheDocument();
    });

    it('shows modification date when present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('Last modified on')).toBeInTheDocument();
    });

    it('does not show submission date when absent', () => {
      const article = { ...baseArticle, submissionDate: undefined };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('Submitted on')).not.toBeInTheDocument();
    });

    it('toggles publication details visibility on click', async () => {
      const user = userEvent.setup();
      const { container } = render(<ArticleDetailsSidebar {...defaultProps} />);

      // Initially opened
      expect(container.querySelector('.articleDetailsSidebar-publicationDetails-content-opened')).toBeInTheDocument();

      const toggleButton = screen.getByText('Publication Details').closest('[role="button"]')!;
      await user.click(toggleButton);

      expect(container.querySelector('.articleDetailsSidebar-publicationDetails-content-opened')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Related volume
  // ─────────────────────────────────────────────────────────────────────────
  describe('Related volume', () => {
    it('does not render related volume when absent', () => {
      render(<ArticleDetailsSidebar {...defaultProps} relatedVolume={undefined} />);
      expect(screen.queryByText(/Volume/)).not.toBeInTheDocument();
    });

    it('renders "Volume N" link for regular volume', () => {
      const relatedVolume: any = { id: 5, num: 3, types: [] };
      render(<ArticleDetailsSidebar {...defaultProps} relatedVolume={relatedVolume} />);
      expect(screen.getByText('Volume 3')).toBeInTheDocument();
    });

    it('renders "Special Issue N" link for special issue volume', () => {
      const relatedVolume: any = { id: 5, num: 2, types: [VOLUME_TYPE.SPECIAL_ISSUE] };
      render(<ArticleDetailsSidebar {...defaultProps} relatedVolume={relatedVolume} />);
      expect(screen.getByText('Special Issue 2')).toBeInTheDocument();
    });

    it('renders "Proceeding N" link for proceeding volume', () => {
      const relatedVolume: any = { id: 5, num: 7, types: [VOLUME_TYPE.PROCEEDINGS] };
      render(<ArticleDetailsSidebar {...defaultProps} relatedVolume={relatedVolume} />);
      expect(screen.getByText('Proceeding 7')).toBeInTheDocument();
    });

    it('volume link href contains volume id', () => {
      const relatedVolume: any = { id: 5, num: 3, types: [] };
      render(<ArticleDetailsSidebar {...defaultProps} relatedVolume={relatedVolume} />);
      const link = screen.getByText('Volume 3').closest('a');
      expect(link).toHaveAttribute('href', '/volumes/5');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Related section
  // ─────────────────────────────────────────────────────────────────────────
  describe('Related section', () => {
    it('renders section title when article.section is present', () => {
      const article = { ...baseArticle, section: { title: { en: 'Physics Section' } } };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('Physics Section')).toBeInTheDocument();
    });

    it('does not render section when article.section is absent', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.queryByText('Physics Section')).not.toBeInTheDocument();
    });

    it('uses language fallback for section title', () => {
      const article = { ...baseArticle, section: { title: { en: 'English Section' } } };
      render(<ArticleDetailsSidebar {...defaultProps} language="fr" article={article} />);
      expect(screen.getByText('English Section')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // DOI
  // ─────────────────────────────────────────────────────────────────────────
  describe('DOI', () => {
    it('renders DOI section when doi is present', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.getByText('DOI')).toBeInTheDocument();
      expect(screen.getByText('10.1234/test')).toBeInTheDocument();
    });

    it('DOI link points to doi.org', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      const doiLink = screen.getByText('10.1234/test').closest('a');
      expect(doiLink).toHaveAttribute('href', 'https://doi.org/10.1234/test');
    });

    it('does not render DOI section when doi is absent', () => {
      const article = { ...baseArticle, doi: undefined };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('DOI')).not.toBeInTheDocument();
    });

    it('does not render DOI section when doi is empty string', () => {
      const article = { ...baseArticle, doi: '   ' };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('DOI')).not.toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // License
  // ─────────────────────────────────────────────────────────────────────────
  describe('License', () => {
    it('does not render license section when article has no license', () => {
      const article = { ...baseArticle, license: undefined };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('License')).not.toBeInTheDocument();
    });

    it('renders license as link when it starts with http', () => {
      const article = { ...baseArticle, license: 'https://creativecommons.org/licenses/by/4.0/' };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('License')).toBeInTheDocument();
      const licenseEl = document.querySelector('.articleDetailsSidebar-license-content-link');
      expect(licenseEl?.tagName).toBe('A');
    });

    it('renders license as text when it does not start with http', () => {
      const article = { ...baseArticle, license: 'CC-BY 4.0' };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('License')).toBeInTheDocument();
      expect(screen.getByText('CC-BY 4.0')).toBeInTheDocument();
      expect(document.querySelector('.articleDetailsSidebar-license-content-link')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Funding
  // ─────────────────────────────────────────────────────────────────────────
  describe('Funding', () => {
    it('does not render funding section when fundings is absent', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.queryByText('Funding')).not.toBeInTheDocument();
    });

    it('does not render funding section when fundings is empty', () => {
      const article = { ...baseArticle, fundings: [] };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.queryByText('Funding')).not.toBeInTheDocument();
    });

    it('renders funding section when fundings has entries', () => {
      const article = { ...baseArticle, fundings: [{ funder: 'ANR', award: 'ANR-21-001' }] };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('Funding')).toBeInTheDocument();
      expect(screen.getByText('ANR')).toBeInTheDocument();
    });

    it('renders award number when present', () => {
      const article = { ...baseArticle, fundings: [{ funder: 'ANR', award: 'ANR-21-001' }] };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('#ANR-21-001')).toBeInTheDocument();
    });

    it('renders funder string when funding is a plain string', () => {
      const article = { ...baseArticle, fundings: ['European Commission'] };
      render(<ArticleDetailsSidebar {...defaultProps} article={article} />);
      expect(screen.getByText('European Commission')).toBeInTheDocument();
    });

    it('toggles funding section visibility on click', async () => {
      const user = userEvent.setup();
      const article = { ...baseArticle, fundings: [{ funder: 'ANR' }] };
      const { container } = render(<ArticleDetailsSidebar {...defaultProps} article={article} />);

      // Initially opened
      expect(container.querySelector('.articleDetailsSidebar-funding-content-opened')).toBeInTheDocument();

      const fundingToggle = screen.getByText('Funding').closest('[role="button"]')!;
      await user.click(fundingToggle);
      expect(container.querySelector('.articleDetailsSidebar-funding-content-opened')).toBeNull();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Metrics slot
  // ─────────────────────────────────────────────────────────────────────────
  describe('Metrics slot', () => {
    it('renders metrics when provided', () => {
      const metrics = <div data-testid="metrics">Metrics content</div>;
      render(<ArticleDetailsSidebar {...defaultProps} metrics={metrics} />);
      expect(screen.getByTestId('metrics')).toBeInTheDocument();
    });

    it('does not render metrics when not provided', () => {
      render(<ArticleDetailsSidebar {...defaultProps} />);
      expect(screen.queryByTestId('metrics')).not.toBeInTheDocument();
    });
  });
});
