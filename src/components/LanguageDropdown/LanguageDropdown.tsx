'use client';

import { useEffect, useRef, useState } from 'react';
import i18next from 'i18next';
import './LanguageDropdown.scss';

import caretUpBlue from '/public/icons/caret-up-blue.svg';
import caretDownBlue from '/public/icons/caret-down-blue.svg';
import caretUpWhite from '/public/icons/caret-up-white.svg';
import caretDownWhite from '/public/icons/caret-down-white.svg';

import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setLanguage } from '@/store/features/i18n/i18n.slice';
import { AvailableLanguage, availableLanguages } from '@/utils/i18n';

interface ILanguageDropdownProps {
  withWhiteCaret?: boolean;
}

export default function LanguageDropdown({ withWhiteCaret }: ILanguageDropdownProps): JSX.Element | null {
  const dispatch = useAppDispatch();
  const language = useAppSelector(state => state.i18nReducer.language);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement | null>(null);

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

    dispatch(setLanguage(updatedLanguage));
    i18next.changeLanguage(updatedLanguage);
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
          <img 
            className='languageDropdown-icon-caret' 
            src={withWhiteCaret ? "/icons/caret-up-white.svg" : "/icons/caret-up-blue.svg"} 
            alt='Caret up icon' 
          />
        ) : (
          <img 
            className='languageDropdown-icon-caret' 
            src={withWhiteCaret ? "/icons/caret-down-white.svg" : "/icons/caret-down-blue.svg"} 
            alt='Caret down icon' 
          />
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