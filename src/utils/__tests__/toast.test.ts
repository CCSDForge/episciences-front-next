import { describe, it, expect, vi } from 'vitest';

vi.mock('react-toastify', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
    warning: vi.fn(),
  },
}));

import { toast } from 'react-toastify';
import { toastSuccess, toastError, toastInfo, toastWarning } from '../toast';

describe('toast helpers', () => {
  it('toastSuccess delegates to toast.success', () => {
    toastSuccess('Saved');
    expect(toast.success).toHaveBeenCalledWith('Saved');
  });

  it('toastError delegates to toast.error', () => {
    toastError('Failed');
    expect(toast.error).toHaveBeenCalledWith('Failed');
  });

  it('toastInfo delegates to toast.info', () => {
    toastInfo('FYI');
    expect(toast.info).toHaveBeenCalledWith('FYI');
  });

  it('toastWarning delegates to toast.warning', () => {
    toastWarning('Careful');
    expect(toast.warning).toHaveBeenCalledWith('Careful');
  });
});
