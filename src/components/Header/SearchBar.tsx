'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SearchBar(): JSX.Element {
  const router = useRouter();
  const [isFocused, setIsFocused] = useState(false);
  const [searchValue, setSearchValue] = useState('');
  const searchContainerRef = useRef<HTMLDivElement>(null);

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
            aria-label="Close search"
          >
            <img src="/icons/caret-left-grey.svg" alt="Back" />
          </button>
        )}

        <div className="header-postheader-search-input">
          <img src="/icons/search.svg" alt="Search" className="header-postheader-search-input-icon" />
          <input
            type="text"
            placeholder="search"
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
            aria-label="Clear search"
          >
            <img src="/icons/close-black.svg" alt="Clear" />
          </button>
        )}

        <div className="header-postheader-search-submit">
          <button type="submit">{isFocused ? 'Search' : 'Submit'}</button>
        </div>
      </form>
    </div>
  );
}