'use client';

import { TFunction } from 'i18next';

import './BoardsSidebar.scss';

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
            onClick={(): void => onSetActiveGroupCallback(index)}
          >
            {group}
          </div>
        ))}
      </div>
    </div>
  );
}
