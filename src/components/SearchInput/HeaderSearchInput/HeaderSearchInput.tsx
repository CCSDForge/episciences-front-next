'use client';

import { ChangeEvent, KeyboardEvent, useState, useRef } from 'react';

import './HeaderSearchInput.scss';

interface IHeaderSearchInputProps {
  value: string;
  placeholder: string;
  isSearching: boolean;
  setIsSearchingCallback: (isSearching: boolean) => void;
  onChangeCallback: (search: string) => void;
  onSubmitCallback: () => void;
}

export default function HeaderSearchInput({ value, placeholder, isSearching, setIsSearchingCallback, onChangeCallback, onSubmitCallback }: IHeaderSearchInputProps): JSX.Element {
  const [preventBlur, setPreventBlur] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' && onSubmitCallback) {
      onSubmitCallback();
      loseInputFocus();
    }
  }

  const handleBlur = (): void => {
    if (!preventBlur) {
      setTimeout(() => setIsSearchingCallback(false), 200)
    }
  }

  const emptySearch = (): void => {
    onChangeCallback('');
    setIsSearchingCallback(false);
    loseInputFocus();
  }

  const loseInputFocus = (): void => {
    if (inputRef.current) {
      inputRef.current.blur();
    }
  }

  return (
    <div className='headerSearchInput'>
      {isSearching ? (
        <img 
          className='headerSearchInput-icon headerSearchInput-icon-caretLeft' 
          src="/icons/caret-left-red.svg" 
          alt='Caret left icon' 
          onClick={(): void => setIsSearchingCallback(false)} 
        />
      ) : (
        <img 
          className='headerSearchInput-icon headerSearchInput-icon-search' 
          src="/icons/search.svg" 
          alt='Search icon' 
        />
      )}
      <input
        ref={inputRef}
        className='headerSearchInput-input'
        value={value}
        placeholder={placeholder}
        onFocus={(): void => setIsSearchingCallback(true)}
        onBlur={(): void => handleBlur()}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChangeCallback(e.target.value)}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>): void => handleKeyDown(e)}
      />
      {isSearching && (
        <img
          className='headerSearchInput-icon headerSearchInput-icon-close'
          src="/icons/close-red.svg"
          alt='Close icon'
          onMouseDown={() => setPreventBlur(true)}
          onMouseUp={() => setPreventBlur(false)}
          onClick={(): void => emptySearch()}
        />
      )}
    </div>
  )
} 