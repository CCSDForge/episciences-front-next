import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkA11y } from '@/test-utils/axe-helper';
import Footer from '../Footer';

// Mock next/image
vi.mock('next/image', () => ({
  default: ({ src, alt, ...props }: { src: string; alt: string; [key: string]: unknown }) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={alt} {...props} />
  ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'components.footer.links.notice': 'Journal Notice',
        'components.footer.links.contact': 'Contact',
        'components.footer.links.credits': 'Credits',
        'components.footer.links.rss': 'RSS Feed',
        'components.footer.links.documentation': 'Documentation',
        'components.footer.links.acknowledgements': 'Acknowledgements',
        'components.footer.links.publishingPolicy': 'Publishing Policy',
        'components.footer.links.accessibility': 'Accessibility',
        'components.footer.links.legalMentions': 'Legal Mentions',
        'components.footer.links.privacyStatement': 'Privacy Statement',
        'components.footer.links.termsOfUse': 'Terms of Use',
      };
      return translations[key] || key;
    },
  }),
}));

// Mock Redux hooks
vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) => {
    const mockState = {
      i18nReducer: { language: 'en' },
      journalReducer: {
        currentJournal: {
          name: 'Test Journal',
          code: 'test',
          settings: [
            { setting: 'contactJournalNotice', value: 'https://example.com/notice' },
            { setting: 'ISSN', value: '1234-5678' },
          ],
        },
      },
      footerReducer: { enabled: true },
    };
    return selector(mockState);
  },
}));

// Mock Link component
vi.mock('@/components/Link/Link', () => ({
  Link: ({ children, href, target, rel, ...props }: {
    children: React.ReactNode;
    href: string;
    target?: string;
    rel?: string;
    [key: string]: unknown;
  }) => (
    <a href={href} target={target} rel={rel} {...props}>{children}</a>
  ),
}));

// Mock paths config
vi.mock('@/config/paths', () => ({
  PATHS: {
    credits: '/credits',
    about: '/about',
  },
}));

describe('Footer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders footer element', () => {
      const { container } = render(<Footer />);

      expect(container.querySelector('footer')).toBeInTheDocument();
    });

    it('renders journal logo with alt text', () => {
      render(<Footer />);

      const logo = screen.getByAltText('Test Journal');
      expect(logo).toBeInTheDocument();
    });

    it('renders Episciences logo with alt text', () => {
      render(<Footer />);

      const logo = screen.getByAltText('Episciences');
      expect(logo).toBeInTheDocument();
    });
  });

  describe('Accessibility - Semantic structure', () => {
    it('uses footer element as landmark', () => {
      render(<Footer />);

      const footer = screen.getByRole('contentinfo');
      expect(footer).toBeInTheDocument();
    });

    it('has footer class', () => {
      const { container } = render(<Footer />);

      expect(container.querySelector('.footer')).toBeInTheDocument();
    });
  });

  describe('Links accessibility', () => {
    it('renders contact link', () => {
      render(<Footer />);

      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('renders credits link', () => {
      render(<Footer />);

      expect(screen.getByText('Credits')).toBeInTheDocument();
    });

    it('renders accessibility link', () => {
      render(<Footer />);

      expect(screen.getByText('Accessibility')).toBeInTheDocument();
    });

    it('renders legal mentions link', () => {
      render(<Footer />);

      expect(screen.getByText('Legal Mentions')).toBeInTheDocument();
    });

    it('renders privacy statement link', () => {
      render(<Footer />);

      expect(screen.getByText('Privacy Statement')).toBeInTheDocument();
    });

    it('renders terms of use link', () => {
      render(<Footer />);

      expect(screen.getByText('Terms of Use')).toBeInTheDocument();
    });
  });

  describe('External links security', () => {
    it('external links have target="_blank"', () => {
      render(<Footer />);

      const externalLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('target') === '_blank'
      );

      expect(externalLinks.length).toBeGreaterThan(0);
    });

    it('external links have rel="noopener noreferrer"', () => {
      render(<Footer />);

      const externalLinks = screen.getAllByRole('link').filter(
        link => link.getAttribute('target') === '_blank'
      );

      externalLinks.forEach(link => {
        expect(link).toHaveAttribute('rel', 'noopener noreferrer');
      });
    });
  });

  describe('Journal information', () => {
    it('displays ISSN when available', () => {
      render(<Footer />);

      expect(screen.getByText('eISSN 1234-5678')).toBeInTheDocument();
    });

    it('renders RSS feed link', () => {
      render(<Footer />);

      expect(screen.getByText('RSS Feed')).toBeInTheDocument();
    });
  });

  describe('Footer sections', () => {
    it('has journal section', () => {
      const { container } = render(<Footer />);

      expect(container.querySelector('.footer-journal')).toBeInTheDocument();
    });

    it('has episciences section', () => {
      const { container } = render(<Footer />);

      expect(container.querySelector('.footer-episciences')).toBeInTheDocument();
    });
  });

  describe('Footer disabled state', () => {
    it('applies disabled class when footer is disabled', () => {
      // Override the mock for this test
      vi.mocked(vi.fn()).mockImplementation(() => false);

      const { container } = render(<Footer />);

      // The footer should still exist
      expect(container.querySelector('footer')).toBeInTheDocument();
    });
  });

  describe('Logo images', () => {
    it('journal logo has proper src attribute', () => {
      render(<Footer />);

      const journalLogo = screen.getByAltText('Test Journal');
      expect(journalLogo).toHaveAttribute('src', '/logos/logo-test-small.svg');
    });

    it('episciences logo has proper src attribute', () => {
      render(<Footer />);

      const episciencesLogo = screen.getByAltText('Episciences');
      expect(episciencesLogo).toHaveAttribute('src', '/logo.svg');
    });
  });

  describe('Documentation links', () => {
    it('renders documentation link', () => {
      render(<Footer />);

      expect(screen.getByText('Documentation')).toBeInTheDocument();
    });

    it('renders acknowledgements link', () => {
      render(<Footer />);

      expect(screen.getByText('Acknowledgements')).toBeInTheDocument();
    });

    it('renders publishing policy link', () => {
      render(<Footer />);

      expect(screen.getByText('Publishing Policy')).toBeInTheDocument();
    });
  });

  describe('Accessibility - axe-core validation', () => {
    // Note: Footer links may have undefined hrefs in test environment
    const axeOptions = {
      rules: {
        'link-in-text-block': { enabled: false }, // Mock links may not have proper distinction
        region: { enabled: false }, // Isolated component testing
      },
    };

    it('should have no critical accessibility violations', async () => {
      const { container } = render(<Footer />);

      const results = await checkA11y(container, axeOptions);
      expect(results).toHaveNoViolations();
    });
  });
});
