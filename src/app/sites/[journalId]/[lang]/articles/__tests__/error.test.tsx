import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ArticlesError from '../error';
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('ArticlesError component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the articles list error message and handles reset click', () => {
    const mockReset = vi.fn();
    const mockError = new Error('Failed to fetch articles list') as Error & { digest?: string };

    render(<ArticlesError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('heading', { level: 2, name: /Articles not available/i })).toBeInTheDocument();
    expect(
      screen.getByText(/The articles list could not be loaded\. Please try again later\./i)
    ).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith('[Articles Error]', mockError);

    const button = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
