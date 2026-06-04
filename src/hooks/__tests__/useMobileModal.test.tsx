import { renderHook, act, render, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { useMobileModal } from '../useMobileModal';
import footerReducer from '@/store/features/footer/footer.slice';

// --- Store factory ---

const createStore = (footerEnabled = false) =>
  configureStore({
    reducer: { footerReducer },
    preloadedState: { footerReducer: { enabled: footerEnabled } },
  });

const wrapper =
  (store: ReturnType<typeof createStore>) =>
  ({ children }: { children: React.ReactNode }) => (
    <Provider store={store}>{children}</Provider>
  );

// --- Tests ---

describe('useMobileModal', () => {
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.style.overflow = '';
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Return values
  // ─────────────────────────────────────────────────────────────────────────
  describe('return values', () => {
    it('returns modalRef, onClose and closeModal', () => {
      const store = createStore();
      const { result } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      expect(result.current.modalRef).toBeDefined();
      expect(typeof result.current.onClose).toBe('function');
      expect(typeof result.current.closeModal).toBe('function');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // closeModal
  // ─────────────────────────────────────────────────────────────────────────
  describe('closeModal', () => {
    it('calls onCloseCallback', () => {
      const store = createStore();
      const { result } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.closeModal();
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('dispatches setFooterVisibility(true)', () => {
      const store = createStore();
      const dispatchSpy = vi.spyOn(store, 'dispatch');
      const { result } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.closeModal();
      });

      // closeModal calls dispatch(setFooterVisibility(true))
      const setTrueCalls = dispatchSpy.mock.calls.filter(
        call =>
          typeof call[0] === 'object' &&
          call[0] !== null &&
          'payload' in call[0] &&
          (call[0] as { payload: boolean }).payload === true
      );
      expect(setTrueCalls.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // onClose
  // ─────────────────────────────────────────────────────────────────────────
  describe('onClose', () => {
    it('calls onCloseCallback', () => {
      const store = createStore();
      const { result } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      act(() => {
        result.current.onClose();
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('calls onBeforeClose before closing', () => {
      const store = createStore();
      const callOrder: string[] = [];
      const onBeforeClose = vi.fn(() => callOrder.push('before'));
      const onCloseCallback = vi.fn(() => callOrder.push('close'));

      const { result } = renderHook(
        () => useMobileModal(onCloseCallback, { onBeforeClose }),
        { wrapper: wrapper(store) }
      );

      act(() => {
        result.current.onClose();
      });

      expect(callOrder).toEqual(['before', 'close']);
    });

    it('does not call onBeforeClose when using closeModal directly', () => {
      const store = createStore();
      const onBeforeClose = vi.fn();

      const { result } = renderHook(
        () => useMobileModal(mockOnClose, { onBeforeClose }),
        { wrapper: wrapper(store) }
      );

      act(() => {
        result.current.closeModal();
      });

      expect(onBeforeClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Escape key
  // ─────────────────────────────────────────────────────────────────────────
  describe('Escape key handler', () => {
    it('calls onClose when Escape is pressed', () => {
      const store = createStore();
      const { result } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(mockOnClose).toHaveBeenCalledTimes(1);
      expect(result.current).toBeDefined();
    });

    it('does not call onClose for other keys', () => {
      const store = createStore();
      renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      act(() => {
        fireEvent.keyDown(document, { key: 'Enter' });
        fireEvent.keyDown(document, { key: 'Tab' });
        fireEvent.keyDown(document, { key: 'ArrowDown' });
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });

    it('removes keydown listener on unmount', () => {
      const store = createStore();
      const { unmount } = renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      unmount();

      act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });

      expect(mockOnClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Click outside
  // ─────────────────────────────────────────────────────────────────────────
  describe('click outside', () => {
    // Use a real component so modalRef gets attached to a DOM element
    function ModalFixture({
      onClose,
      options,
    }: {
      onClose: () => void;
      options?: Parameters<typeof useMobileModal>[1];
    }) {
      const { modalRef } = useMobileModal(onClose, options);
      return (
        <div>
          <div ref={modalRef} data-testid="modal">
            Modal content
          </div>
          <div data-testid="outside">Outside</div>
        </div>
      );
    }

    it('calls onClose when clicking outside the modal element', () => {
      const store = createStore();
      const onClose = vi.fn();
      const { getByTestId } = render(
        <Provider store={store}>
          <ModalFixture onClose={onClose} />
        </Provider>
      );

      act(() => {
        fireEvent.mouseDown(getByTestId('outside'));
      });

      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('does not call onClose when clicking inside the modal element', () => {
      const store = createStore();
      const onClose = vi.fn();
      const { getByTestId } = render(
        <Provider store={store}>
          <ModalFixture onClose={onClose} />
        </Provider>
      );

      act(() => {
        fireEvent.mouseDown(getByTestId('modal'));
      });

      expect(onClose).not.toHaveBeenCalled();
    });

    it('removes mousedown listener on unmount', () => {
      const store = createStore();
      const onClose = vi.fn();
      const { unmount } = render(
        <Provider store={store}>
          <ModalFixture onClose={onClose} />
        </Provider>
      );

      unmount();

      act(() => {
        fireEvent.mouseDown(document.body);
      });

      expect(onClose).not.toHaveBeenCalled();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Body scroll lock
  // ─────────────────────────────────────────────────────────────────────────
  describe('lockBodyScroll', () => {
    it('sets overflow:hidden on mount when lockBodyScroll=true', () => {
      const store = createStore();
      renderHook(() => useMobileModal(mockOnClose, { lockBodyScroll: true }), {
        wrapper: wrapper(store),
      });

      expect(document.body.style.overflow).toBe('hidden');
    });

    it('restores overflow on unmount when lockBodyScroll=true', () => {
      const store = createStore();
      const { unmount } = renderHook(
        () => useMobileModal(mockOnClose, { lockBodyScroll: true }),
        { wrapper: wrapper(store) }
      );

      unmount();

      expect(document.body.style.overflow).toBe('');
    });

    it('does not set overflow when lockBodyScroll=false (default)', () => {
      const store = createStore();
      renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      expect(document.body.style.overflow).not.toBe('hidden');
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Footer visibility management
  // ─────────────────────────────────────────────────────────────────────────
  describe('footer visibility', () => {
    it('dispatches setFooterVisibility(false) when footer is enabled on mount', () => {
      const store = createStore(true); // footer enabled

      renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      // After effect, footer should be disabled (modal is open)
      expect(store.getState().footerReducer.enabled).toBe(false);
    });

    it('does not re-dispatch when footer is already disabled', () => {
      const store = createStore(false); // footer already disabled
      const dispatchSpy = vi.spyOn(store, 'dispatch');

      renderHook(() => useMobileModal(mockOnClose), {
        wrapper: wrapper(store),
      });

      // Should not dispatch anything since footer is already disabled
      const footerActions = dispatchSpy.mock.calls.filter(
        call =>
          typeof call[0] === 'object' &&
          call[0] !== null &&
          'type' in call[0] &&
          (call[0] as { type: string }).type === 'footer/setFooterVisibility'
      );
      expect(footerActions).toHaveLength(0);
    });
  });
});
