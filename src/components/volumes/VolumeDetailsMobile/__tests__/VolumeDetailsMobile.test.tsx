import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { VolumeDetailsMobile } from '../VolumeDetailsMobile';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';
import { VOLUME_TYPE } from '@/utils/volume';
import { IVolume } from '@/types/volume';

const mockDispatch = vi.fn();
let mockState = { footerReducer: { enabled: true } };

vi.mock('@/hooks/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

const t = (key: string) => key;

const relatedVolumes: IVolume[] = [
  { id: 1, num: 1, title: { en: 'Volume 1', fr: 'Volume 1' } } as never,
  { id: 2, num: 2, title: { en: 'Volume 2', fr: 'Volume 2' } } as never,
];

describe('VolumeDetailsMobile', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = { footerReducer: { enabled: true } };
  });

  it('hides the footer on mount when it is enabled', () => {
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    expect(mockDispatch).toHaveBeenCalledWith(setFooterVisibility(false));
  });

  it('renders the default "volumes" title/submit text when volume has no types', () => {
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    expect(screen.getByText('pages.volumeDetails.relatedVolumes.volumes')).toBeInTheDocument();
    expect(
      screen.getByText('pages.volumeDetails.relatedVolumes.lookAtSelectedVolume')
    ).toBeInTheDocument();
  });

  it('renders the proceedings-specific title/submit text', () => {
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        volume={{ id: 9, num: 1, types: [VOLUME_TYPE.PROCEEDINGS] } as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    expect(screen.getByText('pages.volumeDetails.relatedVolumes.proceedings')).toBeInTheDocument();
    expect(
      screen.getByText('pages.volumeDetails.relatedVolumes.lookAtSelectedProceedings')
    ).toBeInTheDocument();
  });

  it('renders the special-issue-specific title/submit text', () => {
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        volume={{ id: 9, num: 1, types: [VOLUME_TYPE.SPECIAL_ISSUE] } as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    expect(
      screen.getByText('pages.volumeDetails.relatedVolumes.specialIssues')
    ).toBeInTheDocument();
    expect(
      screen.getByText('pages.volumeDetails.relatedVolumes.lookAtSelectedIssue')
    ).toBeInTheDocument();
  });

  it('selects and deselects a related volume on click', () => {
    const { container } = render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    const firstVolume = screen.getByText('Volume 1');
    fireEvent.click(firstVolume);
    expect(
      container.querySelector('.volumeDetailsMobile-relatedVolumes-volume-current')
    ).toHaveTextContent('Volume 1');

    fireEvent.click(firstVolume);
    expect(
      container.querySelector('.volumeDetailsMobile-relatedVolumes-volume-current')
    ).not.toBeInTheDocument();
  });

  it('applies the selected volume and closes, restoring the footer', () => {
    const onSelectRelatedVolumeCallback = vi.fn();
    const onCloseCallback = vi.fn();
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={onSelectRelatedVolumeCallback}
        onCloseCallback={onCloseCallback}
      />
    );

    fireEvent.click(screen.getByText('Volume 2'));
    fireEvent.click(screen.getByText('pages.volumeDetails.relatedVolumes.lookAtSelectedVolume'));

    expect(onSelectRelatedVolumeCallback).toHaveBeenCalledWith(2);
    expect(onCloseCallback).toHaveBeenCalled();
    expect(mockDispatch).toHaveBeenCalledWith(setFooterVisibility(true));
  });

  it('does nothing when applying with no volume chosen', () => {
    const onSelectRelatedVolumeCallback = vi.fn();
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={onSelectRelatedVolumeCallback}
        onCloseCallback={vi.fn()}
      />
    );

    fireEvent.click(screen.getByText('pages.volumeDetails.relatedVolumes.lookAtSelectedVolume'));
    expect(onSelectRelatedVolumeCallback).not.toHaveBeenCalled();
  });

  it('closes when clicking the close icon', () => {
    const onCloseCallback = vi.fn();
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={onCloseCallback}
      />
    );

    fireEvent.click(screen.getByLabelText('Close'));
    expect(onCloseCallback).toHaveBeenCalled();
  });

  it('closes when clicking outside the modal', () => {
    const onCloseCallback = vi.fn();
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={onCloseCallback}
      />
    );

    fireEvent.mouseDown(document.body);
    expect(onCloseCallback).toHaveBeenCalled();
  });

  it('does not dispatch setFooterVisibility(false) again when the footer is already hidden', () => {
    mockState = { footerReducer: { enabled: false } };
    render(
      <VolumeDetailsMobile
        language="en"
        t={t as never}
        relatedVolumes={relatedVolumes}
        onSelectRelatedVolumeCallback={vi.fn()}
        onCloseCallback={vi.fn()}
      />
    );

    expect(mockDispatch).not.toHaveBeenCalledWith(setFooterVisibility(false));
  });
});
