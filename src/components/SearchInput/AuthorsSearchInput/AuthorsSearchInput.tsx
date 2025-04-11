'use client';

import { ChangeEvent } from 'react';
import './AuthorsSearchInput.scss';
import searchIcon from '../../../../public/icons/search.svg';

interface IAuthorsSearchInputProps {
  value: string;
  placeholder: string;
  onChangeCallback: (search: string) => void;
}

export default function AuthorsSearchInput({ value, placeholder, onChangeCallback }: IAuthorsSearchInputProps): JSX.Element {
  return (
    <div className="authorsSearchInput">
      <input 
        className="authorsSearchInput-input" 
        value={value} 
        placeholder={placeholder} 
        onChange={(e: ChangeEvent<HTMLInputElement>): void => onChangeCallback(e.target.value)} 
      />
      <img 
        className="authorsSearchInput-icon" 
        src={searchIcon} 
        alt='Search icon' 
      />
    </div>
  )
} 