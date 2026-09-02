import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ExternalEmbedViewer } from '../ExternalEmbedViewer';

const defaultProps = {
  src: 'https://api.nakala.fr/embed/10.34847/nkl.067bpg32/abc?buttons=true',
  title: 'Nakala viewer',
  loadingLabel: 'Loading…',
  errorLabel: 'Failed to load',
  retryLabel: 'Retry',
};

// jsdom/happy-dom's fireEvent.error on an iframe does not trigger React's onError (the
// non-bubbling load/error events rely on real browser capture-phase behavior), so the error
// path is reached the same way PDFProxyIframe's own tests reach it: via the load timeout.
const TIMEOUT_MS = 15000;

describe('ExternalEmbedViewer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders a sandboxed iframe with the given title', () => {
    render(<ExternalEmbedViewer {...defaultProps} />);
    const iframe = screen.getByTitle('Nakala viewer');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', defaultProps.src);
    expect(iframe).toHaveAttribute('referrerpolicy', 'no-referrer');
    expect(iframe).toHaveAttribute('loading', 'lazy');
  });

  it('sandboxes the iframe without allow-forms, allow-modals or allow-top-navigation', () => {
    render(<ExternalEmbedViewer {...defaultProps} />);
    const sandbox = screen.getByTitle('Nakala viewer').getAttribute('sandbox') ?? '';
    expect(sandbox).toContain('allow-scripts');
    expect(sandbox).toContain('allow-same-origin');
    expect(sandbox).not.toContain('allow-forms');
    expect(sandbox).not.toContain('allow-modals');
    expect(sandbox).not.toContain('allow-top-navigation');
  });

  it('shows the loading label before the iframe fires onLoad', () => {
    render(<ExternalEmbedViewer {...defaultProps} />);
    expect(screen.getByText('Loading…')).toBeInTheDocument();
  });

  it('shows the error state and hides the iframe once the load timeout elapses', async () => {
    render(<ExternalEmbedViewer {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(TIMEOUT_MS);
    });

    expect(screen.getByText('Failed to load')).toBeInTheDocument();
    expect(screen.queryByTitle('Nakala viewer')).not.toBeInTheDocument();
  });

  it('re-mounts the iframe when Retry is clicked after an error', async () => {
    render(<ExternalEmbedViewer {...defaultProps} />);

    await act(async () => {
      vi.advanceTimersByTime(TIMEOUT_MS);
    });

    fireEvent.click(screen.getByText('Retry'));

    expect(screen.getByTitle('Nakala viewer')).toBeInTheDocument();
  });
});
