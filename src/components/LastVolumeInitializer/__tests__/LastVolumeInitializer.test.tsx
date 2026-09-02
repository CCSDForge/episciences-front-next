import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LastVolumeInitializer } from '../LastVolumeInitializer';
import { setLastVolume } from '@/store/features/volume/volume.slice';

const mockDispatch = vi.fn();
let mockState: {
  journalReducer: { currentJournal: unknown };
  volumeReducer: { lastVolume: unknown };
};

vi.mock('@/hooks/store', () => ({
  useAppDispatch: () => mockDispatch,
  useAppSelector: (selector: any) => selector(mockState),
}));

describe('LastVolumeInitializer', () => {
  beforeEach(() => {
    mockDispatch.mockClear();
    mockState = {
      journalReducer: { currentJournal: { code: 'journal' } },
      volumeReducer: { lastVolume: undefined },
    };
  });

  it('renders nothing', () => {
    const { container } = render(<LastVolumeInitializer />);
    expect(container).toBeEmptyDOMElement();
  });

  it('dispatches setLastVolume when an initial volume is provided and none is set yet', () => {
    const volume = { id: 1, vid: 1 } as never;
    render(<LastVolumeInitializer initialVolume={volume} />);

    expect(mockDispatch).toHaveBeenCalledWith(setLastVolume(volume));
  });

  it('does not dispatch when there is no initial volume', () => {
    render(<LastVolumeInitializer />);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when there is no current journal', () => {
    mockState.journalReducer.currentJournal = undefined;
    render(<LastVolumeInitializer initialVolume={{ id: 1 } as never} />);
    expect(mockDispatch).not.toHaveBeenCalled();
  });

  it('does not dispatch when a last volume is already set in the store', () => {
    mockState.volumeReducer.lastVolume = { id: 99 };
    render(<LastVolumeInitializer initialVolume={{ id: 1 } as never} />);
    expect(mockDispatch).not.toHaveBeenCalled();
  });
});
