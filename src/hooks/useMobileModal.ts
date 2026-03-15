'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setFooterVisibility } from '@/store/features/footer/footer.slice';

interface UseMobileModalOptions {
  onBeforeClose?: () => void;
  lockBodyScroll?: boolean;
}

/**
 * Encapsulates the common lifecycle of mobile filter modals:
 * - click-outside detection
 * - Escape key handler
 * - footer visibility management
 * - optional body scroll lock
 *
 * Returns `onClose` (with optional pre-close cleanup) and `closeModal` (bare close
 * without cleanup, for use in onApplyFilters).
 */
export function useMobileModal(
  onCloseCallback: () => void,
  { onBeforeClose, lockBodyScroll = false }: UseMobileModalOptions = {}
) {
  const dispatch = useAppDispatch();
  const isFooterEnabled = useAppSelector(state => state.footerReducer.enabled);
  const modalRef = useRef<HTMLDivElement>(null);

  const closeModal = useCallback(() => {
    onCloseCallback();
    dispatch(setFooterVisibility(true));
  }, [onCloseCallback, dispatch]);

  const onClose = useCallback(() => {
    onBeforeClose?.();
    closeModal();
  }, [onBeforeClose, closeModal]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    if (lockBodyScroll) document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
      if (lockBodyScroll) document.body.style.overflow = '';
    };
  }, [onClose, lockBodyScroll]);

  useEffect(() => {
    if (isFooterEnabled) {
      dispatch(setFooterVisibility(false));
    }
  }, [isFooterEnabled, dispatch]);

  return { modalRef, onClose, closeModal };
}
