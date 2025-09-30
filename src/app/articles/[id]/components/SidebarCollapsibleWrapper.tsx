'use client';

import React, { useState, ReactNode } from 'react';

interface SidebarCollapsibleWrapperProps {
  title: string;
  children: ReactNode;
  initialOpen?: boolean;
  className?: string;
}

/**
 * Client-side wrapper for collapsible sections in the sidebar
 * Provides progressive enhancement: content is visible in HTML, JavaScript adds interactivity
 */
export default function SidebarCollapsibleWrapper({
  title,
  children,
  initialOpen = true,
  className = 'articleDetailsSidebar-publicationDetails'
}: SidebarCollapsibleWrapperProps): JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const caretUpGrey = '/icons/caret-up-grey.svg';
  const caretDownGrey = '/icons/caret-down-grey.svg';

  return (
    <div className={className}>
      <div
        className={`${className}-title`}
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={`${className}-title-text`}>{title}</div>
        <img
          className={`${className}-title-caret`}
          src={isOpen ? caretUpGrey : caretDownGrey}
          alt={isOpen ? 'Caret up icon' : 'Caret down icon'}
        />
      </div>
      <div className={`${className}-content ${isOpen ? `${className}-content-opened` : ''}`}>
        {children}
      </div>
    </div>
  );
}