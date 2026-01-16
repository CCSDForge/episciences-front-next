'use client';

import { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import i18next from 'i18next';
import { useTranslation } from 'react-i18next';
import {
  CaretUpBlackIcon,
  CaretDownBlackIcon,
  CaretUpWhiteIcon,
  CaretDownWhiteIcon,
  TranslateIcon,
} from '@/components/icons';
import './LanguageDropdown.scss';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import { selectJournalConfig } from '@/store/features/journal/journal.slice';
import { AvailableLanguage, availableLanguages } from '@/utils/i18n';
import { getLocalizedPath, removeLanguagePrefix } from '@/utils/language-utils';

// Native language names (always displayed in their own language)
const LANGUAGE_NAMES: Record<string, string> = {
  en: 'English',
  fr: 'Français',
  es: 'Español',
  de: 'Deutsch',
  it: 'Italiano',
};

interface ILanguageDropdownProps {
  withWhiteCaret?: boolean;
  initialLanguage?: string;
}

export default function LanguageDropdown({
  withWhiteCaret,
  initialLanguage,
}: ILanguageDropdownProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const journalConfig = useAppSelector(selectJournalConfig);

  // Utiliser la langue initiale ou celle de Redux
  const language = initialLanguage || reduxLanguage;

  const [showDropdown, setShowDropdown] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const menuItemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Synchroniser Redux avec la langue initiale au mount
  useEffect(() => {
    if (initialLanguage && initialLanguage !== reduxLanguage) {
      dispatch(setLanguage(initialLanguage as AvailableLanguage));
    }
  }, [initialLanguage, reduxLanguage, dispatch]);

  // Get accepted languages from journalConfig (multi-tenant) or fallback to process.env (build-time)
  const filteredLanguages = useMemo(() => {
    const acceptedLanguagesStr =
      journalConfig?.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES ||
      process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES ||
      '';
    const acceptedLanguages = acceptedLanguagesStr
      ? acceptedLanguagesStr.split(',').map((lang: string) => lang.trim())
      : [];
    return availableLanguages.filter(
      lang => acceptedLanguages.length === 0 || acceptedLanguages.includes(lang)
    );
  }, [journalConfig]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setFocusedIndex(-1);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showDropdown]);

  // Focus management when dropdown opens
  useEffect(() => {
    if (showDropdown && focusedIndex >= 0 && menuItemRefs.current[focusedIndex]) {
      menuItemRefs.current[focusedIndex]?.focus();
    }
  }, [showDropdown, focusedIndex]);

  const switchLanguage = useCallback(
    (updatedLanguage: AvailableLanguage): void => {
      setShowDropdown(false);
      setFocusedIndex(-1);

      if (updatedLanguage === language) {
        return;
      }

      // Navigate to the localized URL
      if (pathname) {
        // Remove current language prefix if any
        const pathWithoutLang = removeLanguagePrefix(pathname);

        // Get the localized path with new language
        const localizedPath = getLocalizedPath(pathWithoutLang, updatedLanguage);

        // Force full page reload to ensure all components update
        window.location.href = localizedPath;
      }
    },
    [language, pathname]
  );

  const toggleDropdown = (): void => {
    setShowDropdown(prev => !prev);
    if (showDropdown) {
      setFocusedIndex(-1);
      // Return focus to button when closing
      buttonRef.current?.focus();
    }
  };

  // Keyboard handler for the button
  const handleButtonKeyDown = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        toggleDropdown();
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!showDropdown) {
          setShowDropdown(true);
        }
        setFocusedIndex(0);
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (!showDropdown) {
          setShowDropdown(true);
        }
        setFocusedIndex(filteredLanguages.length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };

  // Keyboard handler for menu items
  const handleMenuItemKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number
  ): void => {
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        setFocusedIndex((index + 1) % filteredLanguages.length);
        break;
      case 'ArrowUp':
        event.preventDefault();
        setFocusedIndex((index - 1 + filteredLanguages.length) % filteredLanguages.length);
        break;
      case 'Enter':
      case ' ':
        event.preventDefault();
        switchLanguage(filteredLanguages[index]);
        buttonRef.current?.focus();
        break;
      case 'Escape':
        event.preventDefault();
        setShowDropdown(false);
        setFocusedIndex(-1);
        buttonRef.current?.focus();
        break;
      case 'Tab':
        // Allow default tab behavior but close the menu
        setShowDropdown(false);
        setFocusedIndex(-1);
        break;
    }
  };

  if (filteredLanguages.length <= 1) {
    return null; // Do not render the dropdown if there is only one accepted language
  }

  return (
    <div ref={dropdownRef} className="languageDropdown">
      <button
        ref={buttonRef}
        className="languageDropdown-button"
        role="button"
        aria-haspopup="true"
        aria-expanded={showDropdown}
        aria-label={t('components.header.languageSelector')}
        onClick={toggleDropdown}
        onKeyDown={handleButtonKeyDown}
      >
        <TranslateIcon size={16} className="languageDropdown-button-icon" />
        <span className="languageDropdown-button-text">{language.toUpperCase()}</span>
        {showDropdown ? (
          withWhiteCaret ? (
            <CaretUpWhiteIcon
              size={14}
              className="languageDropdown-button-caret"
              ariaLabel="Collapse language menu"
            />
          ) : (
            <CaretUpBlackIcon
              size={14}
              className="languageDropdown-button-caret"
              ariaLabel="Collapse language menu"
            />
          )
        ) : withWhiteCaret ? (
          <CaretDownWhiteIcon
            size={14}
            className="languageDropdown-button-caret"
            ariaLabel="Expand language menu"
          />
        ) : (
          <CaretDownBlackIcon
            size={14}
            className="languageDropdown-button-caret"
            ariaLabel="Expand language menu"
          />
        )}
      </button>
      <ul
        className={`languageDropdown-menu ${showDropdown ? 'languageDropdown-menu-displayed' : ''}`}
        role="menu"
        aria-label={t('components.header.selectLanguage')}
        hidden={!showDropdown}
      >
        {filteredLanguages.map((availableLanguage: AvailableLanguage, index: number) => (
          <li key={availableLanguage} role="none">
            <button
              ref={el => {
                menuItemRefs.current[index] = el;
              }}
              role="menuitem"
              className="languageDropdown-menu-item"
              aria-current={availableLanguage === language ? 'true' : undefined}
              onClick={() => switchLanguage(availableLanguage)}
              onKeyDown={event => handleMenuItemKeyDown(event, index)}
              tabIndex={-1}
            >
              {availableLanguage.toUpperCase()} -{' '}
              {LANGUAGE_NAMES[availableLanguage] || availableLanguage.toUpperCase()}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
