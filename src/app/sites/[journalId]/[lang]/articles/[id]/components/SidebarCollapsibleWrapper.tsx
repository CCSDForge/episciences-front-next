'use client';

import React, { useState, ReactNode } from 'react';
import { CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';

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
      <div className={`${className}-title`} onClick={() => setIsOpen(!isOpen)}>
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
