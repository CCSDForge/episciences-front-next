import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ClientProviders from '../ClientProviders';

// Mock react-redux Provider
vi.mock('react-redux', () => ({
  Provider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="redux-provider">{children}</div>
  ),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  I18nextProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="i18n-provider">{children}</div>
  ),
  initReactI18next: {
    type: '3rdParty',
    init: () => {},
  },
}));

// Mock i18next
vi.mock('i18next', () => ({
  default: {
    createInstance: () => ({
      use: () => ({
        init: vi.fn(),
      }),
    }),
    hasResourceBundle: () => false,
    addResourceBundle: vi.fn(),
    changeLanguage: vi.fn(),
    language: 'en',
  },
}));

// Mock better-react-mathjax
vi.mock('better-react-mathjax', () => ({
  MathJaxContext: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="mathjax-provider">{children}</div>
  ),
}));

// Mock Redux store
vi.mock('@/store', () => ({
  default: {
    dispatch: vi.fn(),
    getState: () => ({}),
    subscribe: vi.fn(),
  },
}));

// Mock i18n config
vi.mock('@/config/i18n', () => ({
  default: {
    hasResourceBundle: () => false,
    addResourceBundle: vi.fn(),
    changeLanguage: vi.fn(),
    language: 'en',
  },
}));

// Mock mathjax config
vi.mock('@/config/mathjax', () => ({
  mathJaxConfig: {},
  mathJaxSrc: 'https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js',
}));

// Mock child components
vi.mock('@/components/JournalInitializer/JournalInitializer', () => ({
  JournalInitializer: () => <div data-testid="journal-initializer" />,
}));

vi.mock('@/components/LastVolumeInitializer/LastVolumeInitializer', () => ({
  LastVolumeInitializer: () => <div data-testid="last-volume-initializer" />,
}));

vi.mock('@/components/ThemeStyleSwitch/ThemeStyleSwitch', () => ({
  default: () => <div data-testid="theme-style-switch" />,
}));

// Mock Redux slice actions
vi.mock('@/store/features/i18n/i18n.slice', () => ({
  setLanguage: vi.fn((lang) => ({ type: 'i18n/setLanguage', payload: lang })),
}));

vi.mock('@/store/features/journal/journal.slice', () => ({
  setCurrentJournal: vi.fn((journal) => ({ type: 'journal/setCurrentJournal', payload: journal })),
  setApiEndpoint: vi.fn((endpoint) => ({ type: 'journal/setApiEndpoint', payload: endpoint })),
  setJournalConfig: vi.fn((config) => ({ type: 'journal/setJournalConfig', payload: config })),
}));

// Mock language utils
vi.mock('@/utils/language-utils', () => ({
  getLanguageFromPathname: () => 'en',
}));

describe('ClientProviders', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic rendering', () => {
    it('renders children', () => {
      render(
        <ClientProviders>
          <div data-testid="child-content">Test Content</div>
        </ClientProviders>
      );

      expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('wraps content with Redux Provider', () => {
      render(
        <ClientProviders>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByTestId('redux-provider')).toBeInTheDocument();
    });

    it('wraps content with I18nextProvider', () => {
      render(
        <ClientProviders>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByTestId('i18n-provider')).toBeInTheDocument();
    });

    it('wraps content with MathJaxContext', () => {
      render(
        <ClientProviders>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByTestId('mathjax-provider')).toBeInTheDocument();
    });
  });

  describe('Provider hierarchy', () => {
    it('providers are nested in correct order', () => {
      const { container } = render(
        <ClientProviders>
          <div data-testid="inner-content">Content</div>
        </ClientProviders>
      );

      // Redux Provider should be outermost
      const reduxProvider = screen.getByTestId('redux-provider');
      expect(reduxProvider).toBeInTheDocument();

      // I18n Provider should be inside Redux Provider
      const i18nProvider = screen.getByTestId('i18n-provider');
      expect(reduxProvider).toContainElement(i18nProvider);

      // MathJax Provider should be inside I18n Provider
      const mathjaxProvider = screen.getByTestId('mathjax-provider');
      expect(i18nProvider).toContainElement(mathjaxProvider);

      // Content should be inside MathJax Provider
      const content = screen.getByTestId('inner-content');
      expect(mathjaxProvider).toContainElement(content);
    });
  });

  describe('Initial data props', () => {
    it('renders without initial data', () => {
      render(
        <ClientProviders>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts initialLanguage prop', () => {
      render(
        <ClientProviders initialLanguage="fr">
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts initialJournal prop', () => {
      const mockJournal = {
        id: 1,
        code: 'test',
        name: 'Test Journal',
        settings: [],
      };

      render(
        <ClientProviders initialJournal={mockJournal}>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts initialVolume prop', () => {
      const mockVolume = {
        id: 1,
        title: 'Volume 1',
      };

      render(
        <ClientProviders initialVolume={mockVolume as any}>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts apiEndpoint prop', () => {
      render(
        <ClientProviders apiEndpoint="https://api.example.com">
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });

    it('accepts journalConfig prop', () => {
      const config = { theme: 'dark' };

      render(
        <ClientProviders journalConfig={config}>
          <div>Content</div>
        </ClientProviders>
      );

      expect(screen.getByText('Content')).toBeInTheDocument();
    });
  });

  describe('Client-side initialization', () => {
    it('renders ThemeStyleSwitch after mount', async () => {
      render(
        <ClientProviders>
          <div>Content</div>
        </ClientProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme-style-switch')).toBeInTheDocument();
      });
    });

    it('renders JournalInitializer when no initialJournal provided', async () => {
      render(
        <ClientProviders journalId="test">
          <div>Content</div>
        </ClientProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('journal-initializer')).toBeInTheDocument();
      });
    });

    it('does not render JournalInitializer when initialJournal is provided', async () => {
      const mockJournal = {
        id: 1,
        code: 'test',
        name: 'Test Journal',
        settings: [],
      };

      render(
        <ClientProviders initialJournal={mockJournal}>
          <div>Content</div>
        </ClientProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('theme-style-switch')).toBeInTheDocument();
      });

      expect(screen.queryByTestId('journal-initializer')).not.toBeInTheDocument();
    });

    it('renders LastVolumeInitializer when initialVolume is provided', async () => {
      const mockVolume = {
        id: 1,
        title: 'Volume 1',
      };

      render(
        <ClientProviders initialVolume={mockVolume as any}>
          <div>Content</div>
        </ClientProviders>
      );

      await waitFor(() => {
        expect(screen.getByTestId('last-volume-initializer')).toBeInTheDocument();
      });
    });
  });

  describe('Multiple children', () => {
    it('renders multiple children correctly', () => {
      render(
        <ClientProviders>
          <div data-testid="child-1">Child 1</div>
          <div data-testid="child-2">Child 2</div>
        </ClientProviders>
      );

      expect(screen.getByTestId('child-1')).toBeInTheDocument();
      expect(screen.getByTestId('child-2')).toBeInTheDocument();
    });
  });

  describe('Empty children', () => {
    it('renders without children', () => {
      const { container } = render(<ClientProviders />);

      expect(container).toBeInTheDocument();
    });
  });
});
