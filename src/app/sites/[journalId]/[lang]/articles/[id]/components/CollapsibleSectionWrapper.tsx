'use client';

import React, { useState, ReactNode } from 'react';
import CollapsibleSectionHeader from '@/components/CollapsibleSectionHeader/CollapsibleSectionHeader';

interface CollapsibleSectionWrapperProps {
  readonly title: string;
  readonly children: ReactNode;
  readonly initialOpen?: boolean;
  readonly sectionKey: string;
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
}: CollapsibleSectionWrapperProps): React.JSX.Element {
  const [isOpen, setIsOpen] = useState(initialOpen);

  const toggleSection = (): void => setIsOpen(!isOpen);

  return (
    <div className="articleDetails-content-article-section">
      <CollapsibleSectionHeader
        triggerClassName={`articleDetails-content-article-section-title ${!isOpen && 'articleDetails-content-article-section-closed'}`}
        headingClassName="articleDetails-content-article-section-title-text"
        caretClassName="articleDetails-content-article-section-title-caret"
        as="div"
        title={title}
        isOpen={isOpen}
        onToggle={toggleSection}
      />
      <div
        className={`articleDetails-content-article-section-content ${isOpen && 'articleDetails-content-article-section-content-opened'}`}
      >
        {children}
      </div>
    </div>
  );
}
