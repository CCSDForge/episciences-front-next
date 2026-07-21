import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PDFProxyIframe } from '../PDFProxyIframe';

vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() }) },
}));

describe('PDFProxyIframe', () => {
  it('renders a placeholder message when src is empty', () => {
    render(<PDFProxyIframe src="" />);
    expect(screen.getByText('No PDF URL provided')).toBeInTheDocument();
  });

  it('shows a loading state then renders the iframe once mounted', async () => {
    render(<PDFProxyIframe src="https://example.com/doc.pdf" title="My PDF" />);

    await act(async () => {});

    const iframe = document.querySelector('iframe');
    expect(iframe).toBeInTheDocument();
    expect(iframe).toHaveAttribute('src', 'https://example.com/doc.pdf');
    expect(iframe).toHaveAttribute('title', 'My PDF');
  });

  it('applies the custom height and className to the container', async () => {
    const { container } = render(
      <PDFProxyIframe src="https://example.com/doc.pdf" height="400px" className="extra" />
    );
    await act(async () => {});

    const wrapper = container.querySelector('.pdf-proxy-iframe-container');
    expect(wrapper).toHaveClass('extra');
    expect(wrapper).toHaveStyle({ height: '400px' });
  });

  it('shows an error state with a retry button when loading times out', async () => {
    vi.useFakeTimers();
    try {
      render(<PDFProxyIframe src="https://example.com/doc.pdf" />);
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });
      await act(async () => {
        await vi.advanceTimersByTimeAsync(25000);
      });

      expect(screen.getByText('Failed to load PDF preview.')).toBeInTheDocument();
      const retryButton = screen.getByRole('button', { name: 'Retry' });

      await act(async () => {
        fireEvent.click(retryButton);
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(document.querySelector('iframe')).toBeInTheDocument();
      expect(screen.queryByText('Failed to load PDF preview.')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('hides the loading indicator once the iframe reports load', async () => {
    render(<PDFProxyIframe src="https://example.com/doc.pdf" />);
    await act(async () => {});

    const iframe = document.querySelector('iframe')!;
    await act(async () => {
      fireEvent.load(iframe);
    });

    expect(screen.queryByText('Loading PDF preview...')).not.toBeInTheDocument();
  });
});
