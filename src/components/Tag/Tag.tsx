'use client';

import './Tag.scss';
import closeIcon from '../../../public/icons/close-black.svg';

interface ITagProps {
  text: string;
  onCloseCallback: () => void;
}

export default function Tag({ text, onCloseCallback }: ITagProps): JSX.Element {
  return (
    <div className="tag">
      <span className="tag-text">{text}</span>
      <img 
        className="tag-close" 
        src={closeIcon.src} 
        alt='Close icon' 
        onClick={onCloseCallback}
      />
    </div>
  )
} 