import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import RootError from '../error';
import { logger } from '@/lib/logger';

vi.mock('@/lib/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('RootError component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the error message and handles reset click', () => {
    const mockReset = vi.fn();
    const mockError = new Error('Test crash') as Error & { digest?: string };
    mockError.digest = '12345';

    render(<RootError error={mockError} reset={mockReset} />);

    expect(screen.getByRole('heading', { level: 2, name: /Something went wrong/i })).toBeInTheDocument();
    expect(screen.getByText(/An error occurred while loading this page/i)).toBeInTheDocument();
    expect(logger.error).toHaveBeenCalledWith('[Page Error]', mockError);

    const button = screen.getByRole('button', { name: /Try again/i });
    fireEvent.click(button);
    expect(mockReset).toHaveBeenCalledTimes(1);
  });
});
