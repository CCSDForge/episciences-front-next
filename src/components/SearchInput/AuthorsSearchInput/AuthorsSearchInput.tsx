'use client';

import { ChangeEvent, useId } from 'react';
import { SearchIcon } from '@/components/icons';
import './AuthorsSearchInput.scss';

interface IAuthorsSearchInputProps {
  value: string;
  placeholder: string;
  onChangeCallback: (search: string) => void;
  /**
   * Optional label for screen readers.
   * Defaults to "Search authors" if not provided.
   */
  ariaLabel?: string;
}

export default function AuthorsSearchInput({
  value,
  placeholder,
  onChangeCallback,
  ariaLabel = 'Search authors',
}: IAuthorsSearchInputProps): React.JSX.Element {
  const inputId = useId();

  return (
    <div className="authorsSearchInput">
      <label htmlFor={inputId} className="sr-only">
        {ariaLabel}
      </label>
      <input
        id={inputId}
        type="search"
        className="authorsSearchInput-input"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChangeCallback(e.target.value)}
        aria-label={ariaLabel}
      />
      <SearchIcon size={16} className="authorsSearchInput-icon" ariaLabel="Search" />
    </div>
  );
}
