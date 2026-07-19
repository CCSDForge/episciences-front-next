'use client';

import { TFunction } from 'i18next';

import './BoardsSidebar.scss';
import { handleKeyboardClick } from '@/utils/keyboard';

interface IBoardsSidebarProps {
  readonly t: TFunction<'translation', undefined>;
  readonly groups: string[];
  readonly openGroups: Set<number>;
  readonly onSetActiveGroupCallback: (index: number) => void;
  readonly tableOfContentsLabel?: string;
}

export default function BoardsSidebar({
  t,
  groups,
  openGroups,
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
            key={group}
            className={`boardsSidebar-links-row ${openGroups.has(index) && 'boardsSidebar-links-row-active'}`}
            role="button"
            tabIndex={0}
            onClick={(): void => onSetActiveGroupCallback(index)}
            onKeyDown={e => handleKeyboardClick(e, (): void => onSetActiveGroupCallback(index))}
          >
            {group}
          </div>
        ))}
      </div>
    </div>
  );
}
