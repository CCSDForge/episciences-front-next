'use client';

import { use, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { handleKeyboardClick } from '@/utils/keyboard';
import { SidebarDropdownContext, type SidebarDropdownContextValue } from './SidebarDropdownContext';

/** Reads the dropdown contract. Throws when a piece is rendered outside its provider. */
function useSidebarDropdown(): SidebarDropdownContextValue {
  const context = use(SidebarDropdownContext);

  if (!context) {
    throw new Error('SidebarDropdown pieces must be rendered inside <SidebarDropdown.Provider>');
  }

  return context;
}

interface ProviderProps {
  readonly children: React.ReactNode;
  /**
   * Called every time the menu opens, whatever triggered it (click, hover, arrow key).
   * Variants use it to lazy-load their menu content.
   */
  readonly onOpen?: () => void;
}

/**
 * Owns the whole open/closed state machine. Swapping this out is the only change needed
 * to drive the same UI from a different state source.
 */
function SidebarDropdownProvider({ children, onOpen }: ProviderProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(false);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  const open = useCallback((): void => {
    setIsOpen(true);
    onOpen?.();
  }, [onOpen]);

  const close = useCallback((): void => setIsOpen(false), []);

  const toggle = useCallback((): void => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    setIsOpen(true);
    onOpen?.();
  }, [isOpen, onOpen]);

  // Close on touch outside
  useEffect(() => {
    if (!isOpen) return;

    const handleTouchOutside = (event: TouchEvent): void => {
      if (frameRef.current && !frameRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);
    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [isOpen]);

  const value = useMemo<SidebarDropdownContextValue>(
    () => ({
      state: { isOpen },
      actions: { open, close, toggle },
      meta: { frameRef, menuRef, triggerRef },
    }),
    [isOpen, open, close, toggle]
  );

  return <SidebarDropdownContext value={value}>{children}</SidebarDropdownContext>;
}

/** Hover container: opening on pointer enter is progressive enhancement over the trigger. */
function SidebarDropdownFrame({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const {
    actions: { open, close },
    meta: { frameRef },
  } = useSidebarDropdown();

  return (
    // eslint-disable-next-line jsx-a11y/no-static-element-interactions -- Mouse events are progressive enhancement; keyboard handled by the trigger button
    <div
      ref={frameRef}
      className="articleDetailsSidebar-links-link articleDetailsSidebar-links-link-modal"
      onMouseEnter={open}
      onMouseLeave={close}
    >
      {children}
    </div>
  );
}

/** Returns the currently rendered menu items, in DOM order. */
function getMenuItems(menu: HTMLDivElement | null): HTMLElement[] {
  if (!menu) return [];
  return Array.from(menu.querySelectorAll<HTMLElement>('[role="menuitem"]'));
}

function focusMenuItemByIndex(menu: HTMLDivElement | null, index: number): void {
  const items = getMenuItems(menu);
  if (items.length === 0) return;
  items[(index + items.length) % items.length]?.focus();
}

interface TriggerProps {
  readonly icon: React.ReactNode;
  readonly label: string;
}

function SidebarDropdownTrigger({ icon, label }: TriggerProps): React.JSX.Element {
  const {
    state: { isOpen },
    actions: { open, close, toggle },
    meta: { menuRef, triggerRef },
  } = useSidebarDropdown();

  const handleKeyDown = (event: React.KeyboardEvent): void => {
    if (event.key === 'Escape') {
      close();
      return;
    }

    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      open();
      const index = event.key === 'ArrowDown' ? 0 : -1;
      requestAnimationFrame(() => focusMenuItemByIndex(menuRef.current, index));
      return;
    }

    handleKeyboardClick(event, toggle);
  };

  return (
    <button
      ref={triggerRef}
      type="button"
      className="articleDetailsSidebar-links-link-button"
      aria-expanded={isOpen}
      aria-haspopup="menu"
      onClick={toggle}
      onKeyDown={handleKeyDown}
    >
      {icon}
      <span className="articleDetailsSidebar-links-link-text">{label}</span>
    </button>
  );
}

function SidebarDropdownMenu({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  const {
    state: { isOpen },
    actions: { close },
    meta: { menuRef, triggerRef },
  } = useSidebarDropdown();

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    const items = getMenuItems(menuRef.current);
    if (items.length === 0) return;

    const currentIndex = items.indexOf(document.activeElement as HTMLElement);

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        focusMenuItemByIndex(menuRef.current, currentIndex + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        focusMenuItemByIndex(menuRef.current, currentIndex - 1);
        break;
      case 'Home':
        event.preventDefault();
        focusMenuItemByIndex(menuRef.current, 0);
        break;
      case 'End':
        event.preventDefault();
        focusMenuItemByIndex(menuRef.current, items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        close();
        triggerRef.current?.focus();
        break;
      case 'Tab':
        close();
        break;
    }
  };

  return (
    <div
      className={`articleDetailsSidebar-links-link-modal-content ${isOpen && 'articleDetailsSidebar-links-link-modal-content-displayed'}`}
      role="presentation"
    >
      {/* Roving focus is delegated to the menuitem children. */}
      <div
        ref={menuRef}
        className="articleDetailsSidebar-links-link-modal-content-links"
        role="menu"
        onKeyDown={handleKeyDown}
      >
        {children}
      </div>
    </div>
  );
}

interface ItemProps {
  readonly children: React.ReactNode;
  readonly onSelect: () => void;
}

function SidebarDropdownItem({ children, onSelect }: ItemProps): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      className="articleDetailsSidebar-links-link-modal-content-links-link"
      onClick={onSelect}
      onTouchEnd={onSelect}
    >
      {children}
    </button>
  );
}

/** Non-interactive menu row, e.g. a loading placeholder. */
function SidebarDropdownStatus({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="articleDetailsSidebar-links-link-modal-content-links-link">{children}</div>
  );
}

export const SidebarDropdown = {
  Provider: SidebarDropdownProvider,
  Frame: SidebarDropdownFrame,
  Trigger: SidebarDropdownTrigger,
  Menu: SidebarDropdownMenu,
  Item: SidebarDropdownItem,
  Status: SidebarDropdownStatus,
};

export { useSidebarDropdown };
