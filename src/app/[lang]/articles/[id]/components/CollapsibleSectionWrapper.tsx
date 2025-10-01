'use client';

import React, { useState, ReactNode } from 'react';

interface CollapsibleSectionWrapperProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  sectionKey: string;
  caretUpIcon?: string;
  caretDownIcon?: string;
}

/**
 * Client-side wrapper for collapsible sections
 * Provides progressive enhancement: content is visible in HTML, JavaScript adds interactivity
 */
export default function CollapsibleSectionWrapper({
  title,
  children,
  initialOpen = true,
  sectionKey,
  caretUpIcon = '/icons/caret-up-red.svg',
  caretDownIcon = '/icons/caret-down-red.svg'
}: CollapsibleSectionWrapperProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className='articleDetails-content-article-section'>
      <div
        className={`articleDetails-content-article-section-title ${!isOpen && 'articleDetails-content-article-section-closed'}`}
        onClick={(): void => setIsOpen(!isOpen)}
      >
        <div className='articleDetails-content-article-section-title-text'>{title}</div>
        <img
          className='articleDetails-content-article-section-title-caret'
          src={isOpen ? caretUpIcon : caretDownIcon}
          alt={isOpen ? 'Caret up icon' : 'Caret down icon'}
        />
      </div>
      <div className={`articleDetails-content-article-section-content ${isOpen && 'articleDetails-content-article-section-content-opened'}`}>
        {children}
      </div>
    </div>
  );
}