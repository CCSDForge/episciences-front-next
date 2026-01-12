'use client';

import { CloseBlackIcon } from '@/components/icons';
import './Tag.scss';

interface ITagProps {
  text: string;
  onCloseCallback: () => void;
}

export default function Tag({ text, onCloseCallback }: Readonly<ITagProps>): React.JSX.Element {
  return (
    <div className="tag">
      <span className="tag-text">{text}</span>
      <button
        type="button"
        onClick={onCloseCallback}
        className="tag-close"
        aria-label={`Remove ${text} filter`}
      >
        <CloseBlackIcon size={12} />
      </button>
    </div>
  );
}
