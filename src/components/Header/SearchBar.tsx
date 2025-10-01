'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';

interface SearchBarProps {
  lang?: string;
}

export default function SearchBar({ lang }: SearchBarProps): JSX.Element {
  const router = useRouter();
  const { t, i18n } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const [isClient, setIsClient] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Ensure i18n is initialized with correct language before rendering
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang).then(() => {
        setIsClient(true);
      });
    } else {
      setIsClient(true);
    }
  }, [lang, i18n]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    };

    if (isFocused) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
  };

  const handleClose = () => {
    setIsFocused(false);
    setSearchValue('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      // Navigate to search page with the search term
      router.push(`/search?terms=${encodeURIComponent(searchValue.trim())}`);
      // Reset the focused state after submission
      setIsFocused(false);
    }
  };

  // Wait for client-side hydration to avoid mismatch
  if (!isClient) {
    return (
      <div className="header-postheader-search">
        <div className="header-postheader-search-delimiter"></div>
        <form className="header-postheader-search-form">
          <div className="header-postheader-search-input">
            <img src="/icons/search.svg" alt="Search" className="header-postheader-search-input-icon" />
            <input
              type="text"
              placeholder="search"
              disabled
            />
          </div>
          <div className="header-postheader-search-submit">
            <button type="submit" disabled>Submit</button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div
      ref={searchContainerRef}
      className={`header-postheader-search ${isFocused ? 'header-postheader-search-focused' : ''}`}
    >
      {!isFocused && <div className="header-postheader-search-delimiter"></div>}

      <form className="header-postheader-search-form" onSubmit={handleSubmit}>
        {isFocused && (
          <button
            type="button"
            className="header-postheader-search-back"
            onClick={handleClose}
            aria-label={t('components.header.search.closeLabel')}
          >
            <img src="/icons/caret-left-grey.svg" alt={t('components.header.search.backAlt')} />
          </button>
        )}

        <div className="header-postheader-search-input">
          <img src="/icons/search.svg" alt={t('components.header.search.iconAlt')} className="header-postheader-search-input-icon" />
          <input
            type="text"
            placeholder={t('components.header.search.placeholder')}
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            onFocus={handleFocus}
          />
        </div>

        {isFocused && searchValue && (
          <button
            type="button"
            className="header-postheader-search-clear"
            onClick={() => setSearchValue('')}
            aria-label={t('components.header.search.clearLabel')}
          >
            <img src="/icons/close-black.svg" alt={t('components.header.search.clearAlt')} />
          </button>
        )}

        <div className="header-postheader-search-submit">
          <button type="submit">{isFocused ? t('components.header.search.searchButton') : t('components.header.search.submitButton')}</button>
        </div>
      </form>
    </div>
  );
}