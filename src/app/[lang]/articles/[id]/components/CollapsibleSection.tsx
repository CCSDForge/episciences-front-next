"use client";

import { useState } from 'react';
import Image from 'next/image';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({ title, defaultOpen = true, children }: CollapsibleSectionProps) {
  const [isOpened, setIsOpened] = useState(defaultOpen);

  return (
    <div className='articleDetails-content-article-section'>
      <div 
        className={`articleDetails-content-article-section-title ${!isOpened && 'articleDetails-content-article-section-closed'}`} 
        onClick={() => setIsOpened(!isOpened)}
      >
        <div className='articleDetails-content-article-section-title-text'>{title}</div>
        <Image 
          className='articleDetails-content-article-section-title-caret' 
          src={isOpened ? '/icons/caret-up-red.svg' : '/icons/caret-down-red.svg'} 
          alt={isOpened ? 'Caret up icon' : 'Caret down icon'}
          width={14}
          height={14}
        />
      </div>
      <div className={`articleDetails-content-article-section-content ${isOpened && 'articleDetails-content-article-section-content-opened'}`}>
        {children}
      </div>
    </div>
  );
} 