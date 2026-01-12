'use client';

import { useState } from 'react';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
import { handleKeyboardClick } from '@/utils/keyboard';

interface CollapsibleSectionProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpened, setIsOpened] = useState(defaultOpen);

  const toggleSection = () => setIsOpened(!isOpened);

  return (
    <div className="articleDetails-content-article-section">
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isOpened}
        className={`articleDetails-content-article-section-title ${!isOpened && 'articleDetails-content-article-section-closed'}`}
        onClick={toggleSection}
        onKeyDown={(e) => handleKeyboardClick(e, toggleSection)}
      >
        <div className="articleDetails-content-article-section-title-text">{title}</div>
        {isOpened ? (
          <CaretUpBlackIcon
            size={14}
            className="articleDetails-content-article-section-title-caret"
            ariaLabel="Collapse section"
          />
        ) : (
          <CaretDownBlackIcon
            size={14}
            className="articleDetails-content-article-section-title-caret"
            ariaLabel="Expand section"
          />
        )}
      </div>
      <div
        className={`articleDetails-content-article-section-content ${isOpened && 'articleDetails-content-article-section-content-opened'}`}
      >
        {children}
      </div>
    </div>
  );
}
