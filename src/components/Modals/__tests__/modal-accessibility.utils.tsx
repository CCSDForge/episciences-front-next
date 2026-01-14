/**
 * Shared Modal Accessibility Tests
 *
 * This file tests common accessibility patterns across all modal components.
 * Each modal should follow the ARIA dialog pattern with:
 * - role="dialog"
 * - aria-modal="true"
 * - aria-labelledby pointing to a title
 * - FocusTrap for keyboard navigation
 * - Escape key handler
 * - Click outside handler
 */

import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import footerReducer from '@/store/features/footer/footer.slice';

// Common mocks for all modal tests
vi.mock('@/components/icons', () => ({
  CloseBlackIcon: ({ size }: { size: number }) => <span data-testid="close-icon" data-size={size} />,
  CaretUpGreyIcon: ({ size }: { size: number }) => <span data-testid="caret-up-icon" data-size={size} />,
  CaretDownGreyIcon: ({ size }: { size: number }) => <span data-testid="caret-down-icon" data-size={size} />,
}));

vi.mock('@/components/Button/Button', () => ({
  default: ({ text, onClickCallback }: { text: string; onClickCallback: () => void }) => (
    <button onClick={onClickCallback}>{text}</button>
  ),
}));

vi.mock('@/components/Checkbox/Checkbox', () => ({
  default: ({ checked, onChangeCallback }: { checked: boolean; onChangeCallback: () => void }) => (
    <input type="checkbox" checked={checked} onChange={onChangeCallback} />
  ),
}));

vi.mock('@/components/Tag/Tag', () => ({
  default: ({ text, onCloseCallback }: { text: string; onCloseCallback: () => void }) => (
    <span data-testid="tag">
      {text}
      <button onClick={onCloseCallback} aria-label="Remove filter">×</button>
    </span>
  ),
}));

vi.mock('@/components/LiveRegion/LiveRegion', () => ({
  default: ({ message }: { message: string }) => (
    <div role="status" aria-live="polite">{message}</div>
  ),
}));

vi.mock('focus-trap-react', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="focus-trap">{children}</div>,
}));

// Create mock store for modals that use Redux
export const createMockStore = () =>
  configureStore({
    reducer: {
      footerReducer,
    },
    preloadedState: {
      footerReducer: { enabled: true },
    },
  });

// Mock translation function
export const createMockT = () => {
  return vi.fn((key: string, options?: { count?: number }) => {
    const translations: Record<string, string> = {
      'common.filters.filter': 'Filters',
      'common.close': 'Close',
      'common.filters.documentTypes': 'Document Types',
      'common.filters.years': 'Years',
      'common.filters.volumes': 'Volumes',
      'common.filters.sections': 'Sections',
      'common.filters.authors': 'Authors',
      'common.filters.volumeTypes': 'Volume Types',
      'common.filters.applyFilters': 'Apply Filters',
      'common.filters.clearAll': 'Clear all',
      'common.filters.filtersActive': `${options?.count} filters active`,
      'common.filters.noFilters': 'No filters active',
    };
    return translations[key] || key;
  });
};

// Helper to render with Redux provider
export const renderWithStore = (ui: React.ReactElement) => {
  const store = createMockStore();
  return render(<Provider store={store}>{ui}</Provider>);
};

/**
 * Test suite for common modal accessibility requirements
 *
 * Usage in individual modal tests:
 *
 * ```ts
 * import { testModalAccessibility } from './modal-accessibility.shared.test';
 *
 * testModalAccessibility({
 *   name: 'MyModal',
 *   renderModal: (onClose) => <MyModal onCloseCallback={onClose} {...otherProps} />,
 *   useRedux: true, // if the modal uses Redux
 * });
 * ```
 */
interface ModalTestConfig {
  name: string;
  renderModal: (onClose: () => void) => React.ReactElement;
  useRedux?: boolean;
  hasEscapeHandler?: boolean;
}

export function testModalAccessibility(config: ModalTestConfig) {
  const { name, renderModal, useRedux = false, hasEscapeHandler = true } = config;

  describe(`${name} - Common Modal Accessibility`, () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('renders with role="dialog"', () => {
      const onClose = vi.fn();
      const element = renderModal(onClose);

      if (useRedux) {
        renderWithStore(element);
      } else {
        render(element);
      }

      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    it('has aria-modal="true"', () => {
      const onClose = vi.fn();
      const element = renderModal(onClose);

      if (useRedux) {
        renderWithStore(element);
      } else {
        render(element);
      }

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true');
    });

    it('has aria-labelledby attribute', () => {
      const onClose = vi.fn();
      const element = renderModal(onClose);

      if (useRedux) {
        renderWithStore(element);
      } else {
        render(element);
      }

      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby');
    });

    it('wraps content in FocusTrap', () => {
      const onClose = vi.fn();
      const element = renderModal(onClose);

      if (useRedux) {
        renderWithStore(element);
      } else {
        render(element);
      }

      expect(screen.getByTestId('focus-trap')).toBeInTheDocument();
    });

    if (hasEscapeHandler) {
      it('closes on Escape key press', () => {
        const onClose = vi.fn();
        const element = renderModal(onClose);

        if (useRedux) {
          renderWithStore(element);
        } else {
          render(element);
        }

        fireEvent.keyDown(document, { key: 'Escape' });

        // Some modals may have debounced close, so we check if called
        expect(onClose).toHaveBeenCalled();
      });
    }

    it('closes when clicking outside', () => {
      const onClose = vi.fn();
      const element = renderModal(onClose);

      if (useRedux) {
        renderWithStore(
          <div>
            <div data-testid="outside">Outside</div>
            {element}
          </div>
        );
      } else {
        render(
          <div>
            <div data-testid="outside">Outside</div>
            {element}
          </div>
        );
      }

      fireEvent.mouseDown(screen.getByTestId('outside'));

      expect(onClose).toHaveBeenCalled();
    });
  });
}

// Export test utilities
export { vi, describe, it, expect, beforeEach, render, screen, fireEvent };
