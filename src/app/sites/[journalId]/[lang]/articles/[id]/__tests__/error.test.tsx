import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticleDetailsError from '../error';
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ArticleDetailsError component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the article error message and handles reset click', () => {
    const mockReset = vi.fn();
    const mockError = new Error('Failed to fetch article') as Error & { digest?: string };

    render(<ArticleDetailsError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('heading', { level: 2, name: /Article not available/i })).toBeInTheDocument();
    expect(
      screen.getByText(/This article could not be loaded\. It may not exist or be temporarily unavailable\./i)
    ).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith('[Article Error]', mockError);

    const button = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
