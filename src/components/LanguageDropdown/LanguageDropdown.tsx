'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import i18next from 'i18next';
import { CaretUpBlueIcon, CaretDownBlueIcon, CaretUpWhiteIcon, CaretDownWhiteIcon } from '@/components/icons';
import './LanguageDropdown.scss';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import { AvailableLanguage, availableLanguages } from '@/utils/i18n';
import { getLocalizedPath, removeLanguagePrefix } from '@/utils/language-utils';

interface ILanguageDropdownProps {
  withWhiteCaret?: boolean;
  initialLanguage?: string;
}

export default function LanguageDropdown({ withWhiteCaret, initialLanguage }: ILanguageDropdownProps): JSX.Element | null {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const pathname = usePathname();
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);

  // Utiliser la langue initiale ou celle de Redux
  const language = initialLanguage || reduxLanguage;

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

  // Synchroniser Redux avec la langue initiale au mount
  useEffect(() => {
    if (initialLanguage && initialLanguage !== reduxLanguage) {
      dispatch(setLanguage(initialLanguage as AvailableLanguage));
    }
  }, [initialLanguage, reduxLanguage, dispatch]);

  const acceptedLanguagesStr = process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES || '';
  const acceptedLanguages = acceptedLanguagesStr ? acceptedLanguagesStr.split(',') : [];
  const filteredLanguages = availableLanguages.filter(lang =>
    acceptedLanguages.length === 0 || acceptedLanguages.includes(lang)
  );

  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [dropdownRef]);

  const switchLanguage = (updatedLanguage: AvailableLanguage): void => {
    setShowDropdown(false);

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
  };

  if (filteredLanguages.length <= 1) {
    return null; // Do not render the dropdown if there is only one accepted language
  }

  return (
    <div
      ref={dropdownRef}
      className='languageDropdown'
      onMouseEnter={(): void => setShowDropdown(true)}
      onMouseLeave={(): void => setShowDropdown(false)}
      onTouchStart={(): void => setShowDropdown(!showDropdown)}
    >
      <div className='languageDropdown-icon'>
        <div className='languageDropdown-icon-text'>{language.toUpperCase()}</div>
        {showDropdown ? (
          withWhiteCaret ? (
            <CaretUpWhiteIcon size={14} className='languageDropdown-icon-caret' ariaLabel="Collapse language menu" />
          ) : (
            <CaretUpBlueIcon size={14} className='languageDropdown-icon-caret' ariaLabel="Collapse language menu" />
          )
        ) : (
          withWhiteCaret ? (
            <CaretDownWhiteIcon size={14} className='languageDropdown-icon-caret' ariaLabel="Expand language menu" />
          ) : (
            <CaretDownBlueIcon size={14} className='languageDropdown-icon-caret' ariaLabel="Expand language menu" />
          )
        )}
      </div>
      <div className={`languageDropdown-content ${showDropdown && 'languageDropdown-content-displayed'}`}>
        <div className='languageDropdown-content-links'>
          {filteredLanguages.map((availableLanguage: AvailableLanguage, index: number) => (
            <span
              key={index}
              onClick={(): void => switchLanguage(availableLanguage)}
              onTouchEnd={(): void => switchLanguage(availableLanguage)}
            >
              {availableLanguage.toUpperCase()}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
} 