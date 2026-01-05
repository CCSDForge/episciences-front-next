'use client';

import { ChangeEvent } from 'react';
import { SearchIcon } from '@/components/icons';
import './AuthorsSearchInput.scss';

interface IAuthorsSearchInputProps {
  value: string;
  placeholder: string;
  onChangeCallback: (search: string) => void;
}

export default function AuthorsSearchInput({ value, placeholder, onChangeCallback }: IAuthorsSearchInputProps): React.JSX.Element {
  return (
    <div className="authorsSearchInput">
      <input
        className="authorsSearchInput-input"
        value={value}
        placeholder={placeholder}
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChangeCallback(e.target.value)}
      />
      <SearchIcon
        size={16}
        className="authorsSearchInput-icon"
        ariaLabel="Search"
      />
    </div>
  )
} 