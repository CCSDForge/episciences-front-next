'use client';

import { useState, useEffect, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { IBoardMember } from '@/types/board';
import { IBoardPage } from '@/services/board';
import { getBoardsPerTitle, IBoardPerTitle } from '@/utils/board-transforms';
import { CaretUpBlackIcon, CaretDownBlackIcon } from '@/components/icons';
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
  initialPages: IBoardPage[];
  initialMembers: IBoardMember[];
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    boards: string;
  };
  membersCountLabels?: {
    member: string;
    members: string;
  };
  rolesLabels?: Record<string, string>;
  tableOfContentsLabel?: string;
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

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [fullMemberIndex, setFullMemberIndex] = useState(-1);

  const getPagesLabels = (): string[] => {
    if (!boardsData?.pages || !boardsData.pages.length) return [];

    // Use currentLang for consistent rendering
    return boardsData.pages.map(page => page.title[currentLang] || page.title['en'] || '');
  };

  const boardsPerTitle = useMemo(() => {
    if (!boardsData?.pages || !boardsData.pages.length) return [];
    if (!boardsData?.members || !boardsData.members.length) return [];

    return getBoardsPerTitle(boardsData.pages, boardsData.members, currentLang);
  }, [boardsData.pages, boardsData.members, currentLang]);

  const handleGroupToggle = (index: number): void => {
    setActiveGroupIndex(prev => (prev === index ? 0 : index));
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
          activeGroupIndex={activeGroupIndex}
          onSetActiveGroupCallback={handleGroupToggle}
          tableOfContentsLabel={tableOfContentsLabel}
        />
        <div className="boards-content-groups">
          {boardsPerTitle.map((boardPerTitle, index) => (
            <div key={index} className="boards-content-groups-group">
              <div
                className="boards-content-groups-group-title"
                onClick={(): void =>
                  activeGroupIndex === index ? handleGroupToggle(-1) : handleGroupToggle(index)
                }
              >
                <h2>{boardPerTitle.title}</h2>
                {activeGroupIndex === index ? (
                  <CaretUpBlackIcon
                    size={16}
                    className="boards-content-groups-group-caret"
                    ariaLabel="Collapse group"
                  />
                ) : (
                  <CaretDownBlackIcon
                    size={16}
                    className="boards-content-groups-group-caret"
                    ariaLabel="Expand group"
                  />
                )}
              </div>
              <div
                className={`boards-content-groups-group-content ${activeGroupIndex === index && 'boards-content-groups-group-content-active'}`}
              >
                <div className="boards-content-groups-group-content-description">
                  <ReactMarkdown>{boardPerTitle.description}</ReactMarkdown>
                </div>
                <div className="boards-content-groups-group-content-grid">
                  {boardPerTitle.members.map((member, index) => (
                    <BoardCard
                      key={index}
                      language={currentLang}
                      t={t}
                      member={member}
                      fullCard={fullMemberIndex === index}
                      blurCard={fullMemberIndex !== -1 && fullMemberIndex !== index}
                      setFullMemberIndexCallback={(): void =>
                        fullMemberIndex !== index
                          ? setFullMemberIndex(index)
                          : setFullMemberIndex(-1)
                      }
                      rolesLabels={rolesLabels}
                    />
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
