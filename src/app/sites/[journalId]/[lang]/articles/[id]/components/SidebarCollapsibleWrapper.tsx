'use client';

import React, { useState, ReactNode } from 'react';
import { CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import { handleKeyboardClick } from '@/utils/keyboard';

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
  className = 'articleDetailsSidebar-publicationDetails',
}: SidebarCollapsibleWrapperProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  return (
    <div className={className}>
      <div
        className={`${className}-title`}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => handleKeyboardClick(e, () => setIsOpen(!isOpen))}
      >
        <div className={`${className}-title-text`}>{title}</div>
        {isOpen ? (
          <CaretUpGreyIcon size={16} className={`${className}-title-caret`} ariaLabel="Collapse" />
        ) : (
          <CaretDownGreyIcon size={16} className={`${className}-title-caret`} ariaLabel="Expand" />
        )}
      </div>
      <div className={`${className}-content ${isOpen ? `${className}-content-opened` : ''}`}>
        {children}
      </div>
    </div>
  );
}
