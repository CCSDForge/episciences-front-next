import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import VolumeDetailsMobileModal from '../VolumeDetailsMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';
import { VOLUME_TYPE } from '@/utils/volume';

// --- Mocks ---

vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ size }: any) => <span data-testid="close-icon" data-size={size} />,
}));

vi.mock('@/components/Button/Button', () => ({
  default: ({ text, onClickCallback }: { text: string; onClickCallback: () => void }) => (
    <button onClick={onClickCallback}>{text}</button>
  ),
}));

vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="focus-trap">{children}</div>
  ),
}));

// --- Store factory ---

const createMockStore = (footerEnabled = false) =>
  configureStore({
    reducer: { footerReducer },
    preloadedState: { footerReducer: { enabled: footerEnabled } },
  });

// --- Fixtures ---

const mockT = vi.fn((key: string) => {
  const translations: Record<string, string> = {
    'common.close': 'Close',
    'pages.volumeDetails.relatedVolumes.volumes': 'Volumes',
    'pages.volumeDetails.relatedVolumes.proceedings': 'Proceedings',
    'pages.volumeDetails.relatedVolumes.specialIssues': 'Special Issues',
    'pages.volumeDetails.relatedVolumes.lookAtSelectedVolume': 'View selected volume',
    'pages.volumeDetails.relatedVolumes.lookAtSelectedProceedings': 'View selected proceedings',
    'pages.volumeDetails.relatedVolumes.lookAtSelectedIssue': 'View selected issue',
  };
  return translations[key] ?? key;
});

const makeVolume = (id: number, types?: string[]) => ({
  id,
  num: String(id),
  title: { en: `Volume ${id}`, fr: `Numéro ${id}` },
  articles: [],
  downloadLink: '',
  types,
});

const relatedVolumes = [makeVolume(10), makeVolume(11), makeVolume(12)];

const defaultProps = {
  language: 'en' as const,
  t: mockT,
  volume: makeVolume(1),
  relatedVolumes,
  onSelectRelatedVolumeCallback: vi.fn(),
  onCloseCallback: vi.fn(),
};

const renderWithStore = (ui: React.ReactElement, footerEnabled = false) => {
  const store = createMockStore(footerEnabled);
  return { ...render(<Provider store={store}>{ui}</Provider>), store };
};

// --- Tests ---

describe('VolumeDetailsMobileModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─────────────────────────────────────────────────────────────────────────
  // ARIA Dialog Pattern
  // ─────────────────────────────────────────────────────────────────────────
  describe('ARIA Dialog Pattern', () => {
    it('renders with role="dialog"', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby pointing to modal-title h2', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      const dialog = screen.getByRole('dialog');
      expect(dialog).toHaveAttribute('aria-labelledby', 'modal-title');
      const title = document.getElementById('modal-title');
      expect(title).toBeInTheDocument();
      expect(title?.tagName).toBe('H2');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Focus Trap
  // ─────────────────────────────────────────────────────────────────────────
  describe('Focus Trap', () => {
    it('wraps content in FocusTrap', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Title text — varies by volume type
  // ─────────────────────────────────────────────────────────────────────────
  describe('Title text', () => {
    it('shows "Volumes" by default (no types)', () => {
      const volume = makeVolume(1);
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={volume} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Volumes');
    });

    it('shows "Volumes" when volume is undefined', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={undefined} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Volumes');
    });

    it('shows "Proceedings" when volume has PROCEEDINGS type', () => {
      const volume = makeVolume(1, [VOLUME_TYPE.PROCEEDINGS]);
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={volume} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Proceedings');
    });

    it('shows "Special Issues" when volume has SPECIAL_ISSUE type', () => {
      const volume = makeVolume(1, [VOLUME_TYPE.SPECIAL_ISSUE]);
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={volume} />);
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Special Issues');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Submit button text — varies by volume type
  // ─────────────────────────────────────────────────────────────────────────
  describe('Submit button text', () => {
    it('shows "View selected volume" by default', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={makeVolume(1)} />);
      expect(screen.getByRole('button', { name: 'View selected volume' })).toBeInTheDocument();
    });

    it('shows "View selected proceedings" for PROCEEDINGS type', () => {
      const volume = makeVolume(1, [VOLUME_TYPE.PROCEEDINGS]);
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={volume} />);
      expect(
        screen.getByRole('button', { name: 'View selected proceedings' })
      ).toBeInTheDocument();
    });

    it('shows "View selected issue" for SPECIAL_ISSUE type', () => {
      const volume = makeVolume(1, [VOLUME_TYPE.SPECIAL_ISSUE]);
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} volume={volume} />);
      expect(screen.getByRole('button', { name: 'View selected issue' })).toBeInTheDocument();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Related volumes list
  // ─────────────────────────────────────────────────────────────────────────
  describe('Related volumes list', () => {
    it('renders all related volumes', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      expect(screen.getByText('Volume 10')).toBeInTheDocument();
      expect(screen.getByText('Volume 11')).toBeInTheDocument();
      expect(screen.getByText('Volume 12')).toBeInTheDocument();
    });

    it('renders volume titles in the given language', () => {
      renderWithStore(
        <VolumeDetailsMobileModal {...defaultProps} language="fr" />
      );
      expect(screen.getByText('Numéro 10')).toBeInTheDocument();
    });

    it('selects a volume when clicked', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      const vol10 = screen.getByRole('button', { name: 'Volume 10' });
      await user.click(vol10);
      expect(vol10).toHaveClass('volumeDetailsMobileModal-relatedVolumes-volume-current');
    });

    it('deselects a volume when clicked again', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      const vol10 = screen.getByRole('button', { name: 'Volume 10' });
      await user.click(vol10);
      await user.click(vol10);
      expect(vol10).not.toHaveClass('volumeDetailsMobileModal-relatedVolumes-volume-current');
    });

    it('selecting a different volume deselects the previous one', async () => {
      const user = userEvent.setup();
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      const vol10 = screen.getByRole('button', { name: 'Volume 10' });
      const vol11 = screen.getByRole('button', { name: 'Volume 11' });
      await user.click(vol10);
      await user.click(vol11);
      expect(vol10).not.toHaveClass('volumeDetailsMobileModal-relatedVolumes-volume-current');
      expect(vol11).toHaveClass('volumeDetailsMobileModal-relatedVolumes-volume-current');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Apply / Select
  // ─────────────────────────────────────────────────────────────────────────
  describe('Apply (onSelectRelatedVolumeCallback)', () => {
    it('calls onSelectRelatedVolumeCallback with chosen volume id', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      renderWithStore(
        <VolumeDetailsMobileModal
          {...defaultProps}
          onSelectRelatedVolumeCallback={onSelect}
        />
      );
      await user.click(screen.getByRole('button', { name: 'Volume 11' }));
      await user.click(screen.getByRole('button', { name: 'View selected volume' }));
      expect(onSelect).toHaveBeenCalledOnce();
      expect(onSelect).toHaveBeenCalledWith(11);
    });

    it('does not call onSelectRelatedVolumeCallback when no volume is selected', async () => {
      const user = userEvent.setup();
      const onSelect = vi.fn();
      // volume=undefined → chosenVolume starts as undefined → guard fires
      renderWithStore(
        <VolumeDetailsMobileModal
          {...defaultProps}
          volume={undefined}
          onSelectRelatedVolumeCallback={onSelect}
        />
      );
      await user.click(screen.getByRole('button', { name: 'View selected volume' }));
      expect(onSelect).not.toHaveBeenCalled();
    });

    it('calls onCloseCallback when apply is clicked with a selection', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(
        <VolumeDetailsMobileModal {...defaultProps} onCloseCallback={onClose} />
      );
      await user.click(screen.getByRole('button', { name: 'Volume 10' }));
      await user.click(screen.getByRole('button', { name: 'View selected volume' }));
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Close button
  // ─────────────────────────────────────────────────────────────────────────
  describe('Close button', () => {
    it('has accessible close button with aria-label', () => {
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Close' })).toBeInTheDocument();
    });

    it('calls onCloseCallback when close button is clicked', async () => {
      const user = userEvent.setup();
      const onClose = vi.fn();
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(onClose).toHaveBeenCalledOnce();
    });

    it('calls onCloseCallback when clicking outside the modal', () => {
      const onClose = vi.fn();
      renderWithStore(<VolumeDetailsMobileModal {...defaultProps} onCloseCallback={onClose} />);
      fireEvent.mouseDown(document.body);
      expect(onClose).toHaveBeenCalledOnce();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Footer Redux side-effect
  // ─────────────────────────────────────────────────────────────────────────
  describe('Footer dispatch', () => {
    it('dispatches setFooterVisibility(false) on mount when footer is enabled', () => {
      const store = createMockStore(true);
      render(
        <Provider store={store}>
          <VolumeDetailsMobileModal {...defaultProps} />
        </Provider>
      );
      expect(store.getState().footerReducer.enabled).toBe(false);
    });

    it('dispatches setFooterVisibility(true) when apply is clicked', async () => {
      const user = userEvent.setup();
      const store = createMockStore(false);
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      render(
        <Provider store={store}>
          <VolumeDetailsMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByRole('button', { name: 'Volume 10' }));
      await user.click(screen.getByRole('button', { name: 'View selected volume' }));
      // The "footer re-disable" useEffect fires after setFooterVisibility(true),
      // so we verify the dispatch was called rather than checking the final store state.
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });

    it('dispatches setFooterVisibility(true) when close button is clicked', async () => {
      const user = userEvent.setup();
      const store = createMockStore(false);
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      render(
        <Provider store={store}>
          <VolumeDetailsMobileModal {...defaultProps} />
        </Provider>
      );
      await user.click(screen.getByRole('button', { name: 'Close' }));
      expect(dispatchSpy).toHaveBeenCalledWith(
        expect.objectContaining({ type: 'footer/setFooterVisibility', payload: true })
      );
    });
  });
});
