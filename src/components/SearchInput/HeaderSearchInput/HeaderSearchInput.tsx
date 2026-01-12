'use client';

import { CaretLeftBlackIcon, SearchIcon, CloseBlackIcon } from '@/components/icons';
import { ChangeEvent, KeyboardEvent, useState, useRef, useId } from 'react';

import './HeaderSearchInput.scss';

interface IHeaderSearchInputProps {
  value: string;
  placeholder: string;
  isSearching: boolean;
  setIsSearchingCallback: (isSearching: boolean) => void;
  onChangeCallback: (search: string) => void;
  onSubmitCallback: () => void;
  /**
   * Optional label for screen readers.
   * Defaults to "Search" if not provided.
   */
  ariaLabel?: string;
}

export default function HeaderSearchInput({
  value,
  placeholder,
  isSearching,
  setIsSearchingCallback,
  onChangeCallback,
  onSubmitCallback,
  ariaLabel = 'Search',
}: IHeaderSearchInputProps): React.JSX.Element {
  const [preventBlur, setPreventBlur] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && onSubmitCallback) {
      onSubmitCallback();
      loseInputFocus();
    }
  };

  const handleBlur = (): void => {
    if (!preventBlur) {
      setTimeout(() => setIsSearchingCallback(false), 200);
    }
  };

  const emptySearch = (): void => {
    onChangeCallback('');
    setIsSearchingCallback(false);
    loseInputFocus();
  };

  const loseInputFocus = (): void => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  };

  return (
    <div className="headerSearchInput">
      <label htmlFor={inputId} className="sr-only">
        {ariaLabel}
      </label>
      {isSearching ? (
        <CaretLeftBlackIcon
          size={16}
          className="headerSearchInput-icon headerSearchInput-icon-caretLeft"
          ariaLabel="Back"
          onClick={(): void => setIsSearchingCallback(false)}
        />
      ) : (
        <SearchIcon
          size={16}
          className="headerSearchInput-icon headerSearchInput-icon-search"
          ariaLabel="Search"
        />
      )}
      <input
        id={inputId}
        ref={inputRef}
        type="search"
        className="headerSearchInput-input"
        value={value}
        placeholder={placeholder}
        onFocus={(): void => setIsSearchingCallback(true)}
        onBlur={(): void => handleBlur()}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChangeCallback(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => handleKeyDown(e)}
        aria-label={ariaLabel}
      />
      {isSearching && (
        <CloseBlackIcon
          size={16}
          className="headerSearchInput-icon headerSearchInput-icon-close"
          ariaLabel="Clear"
          onMouseDown={() => setPreventBlur(true)}
          onMouseUp={() => setPreventBlur(false)}
          onClick={(): void => emptySearch()}
        />
      )}
    </div>
  );
}
