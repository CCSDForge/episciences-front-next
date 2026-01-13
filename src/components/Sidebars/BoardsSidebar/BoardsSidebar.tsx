'use client';

import { TFunction } from 'i18next';

import './BoardsSidebar.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

interface IBoardsSidebarProps {
  t: TFunction<'translation', undefined>;
  groups: string[];
  activeGroupIndex: number;
  onSetActiveGroupCallback: (index: number) => void;
  tableOfContentsLabel?: string;
}

export default function BoardsSidebar({
  t,
  groups,
  activeGroupIndex,
  onSetActiveGroupCallback,
  tableOfContentsLabel,
}: IBoardsSidebarProps): React.JSX.Element {
  return (
    <div className="boardsSidebar">
      <div className="boardsSidebar-resume">
        {tableOfContentsLabel || t('pages.boards.tableOfContents')}
      </div>
      <div className="boardsSidebar-links">
        {groups.map((group, index) => (
          <div
            key={index}
            className={`boardsSidebar-links-row ${index === activeGroupIndex && 'boardsSidebar-links-row-active'}`}
            role="button"
            tabIndex={0}
            onClick={(): void => onSetActiveGroupCallback(index)}
            onKeyDown={(e) => handleKeyboardClick(e, (): void => onSetActiveGroupCallback(index))}
          >
            {group}
          </div>
        ))}
      </div>
    </div>
  );
}
