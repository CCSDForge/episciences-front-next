'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import Link from 'next/link';
import { MenuItemConfig } from '@/config/menu';
import './HeaderDropdown.scss';

interface HeaderDropdownProps {
  label: string; // Already translated label
  items: MenuItemConfig[];
  isOpen: boolean;
  onToggle: (opened: boolean) => void;
  dropdownKey: string; // 'content' | 'about' | 'publish'
  className?: string;
}

/**
 * Accessible dropdown component for header navigation
 *
 * Implements WCAG 2.1 AA accessibility standards with:
 * - Full keyboard navigation (Tab, Enter, Space, Arrow keys, Escape)
 * - ARIA attributes for screen readers
 * - Focus management and visible focus indicators
 * - Active link indication
 * - Click outside detection
 */
export default function HeaderDropdown({
  label,
  items,
  isOpen,
  onToggle,
  dropdownKey,
  className = '',
}: HeaderDropdownProps): React.JSX.Element {
  const { t } = useTranslation();
  const pathname = usePathname();
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRefs = useRef<(HTMLAnchorElement | null)[]>([]);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        onToggle(false);
        setFocusedIndex(-1);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onToggle]);

  // Focus management when dropdown opens
  useEffect(() => {
    if (isOpen && focusedIndex >= 0 && menuRefs.current[focusedIndex]) {
      menuRefs.current[focusedIndex]?.focus();
    }
  }, [isOpen, focusedIndex]);

  // Close dropdown when pathname changes (navigation occurred)
  useEffect(() => {
    onToggle(false);
    setFocusedIndex(-1);
  }, [pathname, onToggle]);

  // Keyboard handler for the dropdown button
  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        onToggle(!isOpen);
        if (!isOpen) {
          setFocusedIndex(0);
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          onToggle(true);
        }
        setFocusedIndex(0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!isOpen) {
          onToggle(true);
        }
        setFocusedIndex(items.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        onToggle(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
    }
  };

  // Keyboard handler for menu items
  const handleMenuItemKeyDown = (
    event: React.KeyboardEvent<HTMLAnchorElement>,
    index: number
  ): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((index + 1) % items.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((index - 1 + items.length) % items.length);
        break;
      case 'Escape':
        event.preventDefault();
        onToggle(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Allow default tab behavior but close the menu
        onToggle(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Check if a link is currently active
  const isActiveLink = useCallback(
    (itemPath: string): boolean => {
      if (!pathname) return false;

      // Exact match
      if (pathname === itemPath) return true;

      // Match for query params (e.g., /volumes?type=special_issue)
      const [pathBase] = itemPath.split('?');
      if (pathname === pathBase) return true;

      return false;
    },
    [pathname]
  );

  return (
    <div
      ref={dropdownRef}
      className={`header-dropdown ${className}`}
      onMouseEnter={() => onToggle(true)}
      onMouseLeave={() => onToggle(false)}
    >
      <button
        ref={buttonRef}
        className="header-dropdown-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label={`${label} menu`}
        onKeyDown={handleButtonKeyDown}
        type="button"
      >
        <span>{label}</span>
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-label={`${label} menu`}
          className="header-dropdown-menu"
          onMouseLeave={() => onToggle(false)}
        >
          {items.map((item, index) => {
            const isActive = isActiveLink(item.path);
            return (
              <Link
                key={item.key}
                href={item.path}
                role="menuitem"
                aria-current={isActive ? 'page' : undefined}
                ref={el => {
                  menuRefs.current[index] = el;
                }}
                onKeyDown={e => handleMenuItemKeyDown(e, index)}
                className={`header-dropdown-menu-item ${isActive ? 'active' : ''}`}
                tabIndex={focusedIndex === index ? 0 : -1}
              >
                {t(item.label)}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
