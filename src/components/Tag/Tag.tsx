'use client';

import { CloseBlackIcon } from '@/components/icons';
import './Tag.scss';

interface ITagProps {
  text: string;
  onCloseCallback: () => void;
}

export default function Tag({ text, onCloseCallback }: Readonly<ITagProps>): JSX.Element {
  return (
    <div className="tag">
      <span className="tag-text">{text}</span>
      <CloseBlackIcon
        size={12}
        className="tag-close"
        ariaLabel="Close tag"
        onClick={onCloseCallback}
      />
    </div>
  )
} 