'use client';

import { useState, useEffect, useMemo } from 'react';
import CollapsibleSectionHeader from '@/components/CollapsibleSectionHeader/CollapsibleSectionHeader';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';
import { useTranslation } from 'react-i18next';
import { IBoardMember } from '@/types/board';
import { IBoardPage } from '@/services/board';
import { getBoardsPerTitle } from '@/utils/board-transforms';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import BoardCard from '@/components/Cards/BoardCard/BoardCard';
import BoardsSidebar from '@/components/Sidebars/BoardsSidebar/BoardsSidebar';
import PageTitle from '@/components/PageTitle/PageTitle';
import '@/styles/transitions.scss';
import './Boards.scss';

interface BoardsData {
  pages: IBoardPage[];
  members: IBoardMember[];
}

interface BoardsClientProps {
  readonly initialPages: IBoardPage[];
  readonly initialMembers: IBoardMember[];
  readonly lang?: string;
  readonly breadcrumbLabels?: {
    home: string;
    boards: string;
  };
  readonly membersCountLabels?: {
    member: string;
    members: string;
  };
  readonly rolesLabels?: Record<string, string>;
  readonly tableOfContentsLabel?: string;
}

export default function BoardsClient({
  initialPages,
  initialMembers,
  lang,
  breadcrumbLabels,
  membersCountLabels,
  rolesLabels,
  tableOfContentsLabel,
}: BoardsClientProps): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Use the prop lang for rendering to ensure consistency with SSR
  // The lang prop is always provided by the server component, so we use it directly
  const currentLang = (lang || 'en') as 'en' | 'fr';

  // Synchroniser la langue avec le paramètre de l'URL pour les futures interactions client
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

  // Use initial data from Server Component (ISR handles freshness via Cache Components)
  const boardsData: BoardsData = useMemo(
    () => ({
      pages: initialPages,
      members: initialMembers,
    }),
    [initialPages, initialMembers]
  );

  const [openGroups, setOpenGroups] = useState<Set<number>>(new Set([0]));
  // Identifies the currently expanded member card as "<groupIndex>-<memberIndex>".
  // Using a composite key (rather than a bare member index) prevents the card at
  // the same position in a different group from also appearing expanded/blurred.
  const [expandedMemberKey, setExpandedMemberKey] = useState<string | null>(null);

  const getPagesLabels = (): string[] => {
    if (!boardsPerTitle.length) return [];

    return boardsPerTitle.map(board => rolesLabels?.[board.page_code] || board.title);
  };

  const boardsPerTitle = useMemo(() => {
    if (!boardsData?.members?.length) return [];

    return getBoardsPerTitle(boardsData.pages || [], boardsData.members, currentLang);
  }, [boardsData.pages, boardsData.members, currentLang]);

  const handleGroupToggle = (index: number): void => {
    setOpenGroups(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleMemberToggle = (memberKey: string): void => {
    setExpandedMemberKey(prev => (prev === memberKey ? null : memberKey));
  };

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels ? `${breadcrumbLabels.home} >` : `${t('pages.home.title')} >`,
    },
  ];

  return (
    <main className="boards">
      <PageTitle title={breadcrumbLabels?.boards || t('pages.boards.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.boards || t('pages.boards.title')}
        lang={lang}
      />

      <div className="boards-title">
        <h1 className="boards-title-text">{breadcrumbLabels?.boards || t('pages.boards.title')}</h1>
        {boardsData?.members &&
          boardsData.members.length > 0 &&
          (boardsData.members.length > 1 ? (
            <div className="boards-title-count">
              {boardsData.members.length} {membersCountLabels?.members || t('common.members')}
            </div>
          ) : (
            <div className="boards-title-count">
              {boardsData.members.length} {membersCountLabels?.member || t('common.member')}
            </div>
          ))}
      </div>

      <div className="boards-content">
        <BoardsSidebar
          t={t}
          groups={getPagesLabels()}
          openGroups={openGroups}
          onSetActiveGroupCallback={handleGroupToggle}
          tableOfContentsLabel={tableOfContentsLabel}
        />
        <div className="boards-content-groups">
          {boardsPerTitle.map((boardPerTitle, groupIndex) => (
            <div key={boardPerTitle.page_code} className="boards-content-groups-group">
              <CollapsibleSectionHeader
                triggerClassName="boards-content-groups-group-title"
                caretClassName="boards-content-groups-group-caret"
                title={rolesLabels?.[boardPerTitle.page_code] || boardPerTitle.title}
                isOpen={openGroups.has(groupIndex)}
                onToggle={(): void => handleGroupToggle(groupIndex)}
                collapseLabel="Collapse group"
                expandLabel="Expand group"
              />
              <div
                className={`boards-content-groups-group-content ${openGroups.has(groupIndex) && 'boards-content-groups-group-content-active'}`}
              >
                <div className="boards-content-groups-group-content-description">
                  <MarkdownRenderer>{boardPerTitle.description}</MarkdownRenderer>
                </div>
                <div className="boards-content-groups-group-content-grid">
                  {boardPerTitle.members.map((member, memberIndex) => {
                    const memberKey = `${groupIndex}-${memberIndex}`;
                    return (
                      <BoardCard
                        key={member.id || memberKey}
                        language={currentLang}
                        t={t}
                        member={member}
                        state={
                          expandedMemberKey === memberKey
                            ? 'expanded'
                            : expandedMemberKey !== null
                              ? 'blurred'
                              : 'default'
                        }
                        onToggle={(): void => handleMemberToggle(memberKey)}
                        rolesLabels={rolesLabels}
                      />
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
