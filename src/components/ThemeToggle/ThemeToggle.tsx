'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { SunIcon, MoonIcon, MonitorIcon, CaretUpIcon, CaretDownIcon } from '@/components/icons';
import { useIsHydrated } from '@/hooks/useIsHydrated';
import { useColorScheme, THEME_PREFERENCES, ThemePreference } from '@/hooks/useColorScheme';
import './ThemeToggle.scss';

const PREFERENCE_ICONS: Record<ThemePreference, typeof SunIcon> = {
  light: SunIcon,
  dark: MoonIcon,
  system: MonitorIcon,
};

/**
 * Theme selector: light (default), dark, or follow the system.
 *
 * The button icon and text label paint with zero JS: all three variants are
 * rendered and CSS keyed on the `data-theme` attribute (set by the bootstrap
 * script before first paint) shows the matching one — so there is no
 * "Theme" → "Light" swap on hydration. Only the aria-label waits for hydration,
 * since the stored preference is unknown on the server.
 */
export default function ThemeToggle(): React.JSX.Element {
  const { t } = useTranslation();
  const isHydrated = useIsHydrated();
  const { preference, setPreference } = useColorScheme();

  const [showMenu, setShowMenu] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const closeMenu = useCallback((returnFocus: boolean): void => {
    setShowMenu(false);
    setFocusedIndex(-1);
    if (returnFocus) buttonRef.current?.focus();
  }, []);

  const openMenuAt = (index: number): void => {
    setShowMenu(true);
    setFocusedIndex(index);
  };

  useEffect(() => {
    if (!showMenu) return;

    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        closeMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showMenu, closeMenu]);

  useEffect(() => {
    if (showMenu && focusedIndex >= 0) {
      itemRefs.current[focusedIndex]?.focus();
    }
  }, [showMenu, focusedIndex]);

  const selectPreference = (next: ThemePreference): void => {
    setPreference(next);
    closeMenu(true);
  };

  const checkedIndex = THEME_PREFERENCES.indexOf(preference);
  const lastIndex = THEME_PREFERENCES.length - 1;

  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'Enter':
      case ' ':
      case 'ArrowDown':
        event.preventDefault();
        openMenuAt(checkedIndex);
        break;
      case 'ArrowUp':
        event.preventDefault();
        openMenuAt(lastIndex);
        break;
      case 'Escape':
        if (showMenu) {
          event.preventDefault();
          closeMenu(false);
        }
        break;
    }
  };

  const handleItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex(index === lastIndex ? 0 : index + 1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex(index === 0 ? lastIndex : index - 1);
        break;
      case 'Home':
        event.preventDefault();
        setFocusedIndex(0);
        break;
      case 'End':
        event.preventDefault();
        setFocusedIndex(lastIndex);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        selectPreference(THEME_PREFERENCES[index]);
        break;
      case 'Escape':
        event.preventDefault();
        closeMenu(true);
        break;
      case 'Tab':
        closeMenu(false);
        break;
    }
  };

  const buttonLabel = isHydrated
    ? `${t('components.themeToggle.label')}: ${t(`components.themeToggle.${preference}`)}`
    : t('components.themeToggle.label');

  return (
    <div ref={containerRef} className="themeToggle">
      <button
        ref={buttonRef}
        type="button"
        className="themeToggle-button"
        aria-haspopup="menu"
        aria-expanded={showMenu}
        aria-label={buttonLabel}
        onClick={() => (showMenu ? closeMenu(false) : setShowMenu(true))}
        onKeyDown={handleButtonKeyDown}
      >
        {THEME_PREFERENCES.map(pref => {
          const Icon = PREFERENCE_ICONS[pref];
          return (
            <span key={pref} className={`themeToggle-icon themeToggle-icon-${pref}`}>
              <Icon size={18} />
            </span>
          );
        })}
        {THEME_PREFERENCES.map(pref => (
          <span key={pref} className={`themeToggle-text themeToggle-text-${pref}`}>
            {t(`components.themeToggle.${pref}`)}
          </span>
        ))}
        {showMenu ? (
          <CaretUpIcon size={14} className="themeToggle-caret" />
        ) : (
          <CaretDownIcon size={14} className="themeToggle-caret" />
        )}
      </button>
      <ul
        className={`themeToggle-menu ${showMenu ? 'themeToggle-menu-displayed' : ''}`}
        role="menu"
        aria-label={t('components.themeToggle.selectTheme')}
        hidden={!showMenu}
      >
        {THEME_PREFERENCES.map((pref, index) => {
          const Icon = PREFERENCE_ICONS[pref];
          return (
            <li key={pref} role="none">
              <button
                ref={el => {
                  itemRefs.current[index] = el;
                }}
                type="button"
                role="menuitemradio"
                className="themeToggle-menu-item"
                aria-checked={pref === preference}
                onClick={() => selectPreference(pref)}
                onKeyDown={event => handleItemKeyDown(event, index)}
                tabIndex={-1}
              >
                <Icon size={16} />
                <span>{t(`components.themeToggle.${pref}`)}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
