'use client';

import { createContext } from 'react';

/**
 * Generic contract shared by every sidebar dropdown variant.
 *
 * The provider is the only place that knows how the open/closed state is managed;
 * the pieces below (and any variant-specific menu content) only consume this interface.
 */
export interface SidebarDropdownState {
  isOpen: boolean;
}

export interface SidebarDropdownActions {
  open: () => void;
  close: () => void;
  toggle: () => void;
}

export interface SidebarDropdownMeta {
  /** Wraps trigger + menu; used to detect touches landing outside the dropdown. */
  frameRef: React.RefObject<HTMLDivElement | null>;
  /** Wraps the `role="menu"` element; used to enumerate and focus `role="menuitem"` children. */
  menuRef: React.RefObject<HTMLDivElement | null>;
  /** The trigger button, refocused when the menu is dismissed with Escape. */
  triggerRef: React.RefObject<HTMLButtonElement | null>;
}

export interface SidebarDropdownContextValue {
  state: SidebarDropdownState;
  actions: SidebarDropdownActions;
  meta: SidebarDropdownMeta;
}

export const SidebarDropdownContext = createContext<SidebarDropdownContextValue | null>(null);
