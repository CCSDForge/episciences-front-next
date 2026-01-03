'use client';

import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from "@/hooks/store";
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { IBoardMember } from '@/types/board';
import { IBoardPage, fetchBoardPages, fetchBoardMembers } from '@/services/board';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import BoardCard from '@/components/Cards/BoardCard/BoardCard';
import BoardsSidebar from '@/components/Sidebars/BoardsSidebar/BoardsSidebar';
import PageTitle from '@/components/PageTitle/PageTitle';
import '@/styles/transitions.scss';
import './Boards.scss';

interface IBoardPerTitle {
  title: string;
  description: string;
  members: IBoardMember[];
}

interface BoardsData {
  pages: IBoardPage[];
  members: IBoardMember[];
}

interface BoardsClientProps {
  initialPages: IBoardPage[];
  initialMembers: IBoardMember[];
}

export default function BoardsClient({
  initialPages,
  initialMembers
}: BoardsClientProps): JSX.Element {
  const { t } = useTranslation();
  const language = useAppSelector(state => state.i18nReducer.language);
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  // Architecture hybride : fetch automatique des données fraîches
  const initialData: BoardsData = {
    pages: initialPages,
    members: initialMembers
  };

  const { data: boardsData, isUpdating } = useClientSideFetch({
    fetchFn: async () => {
      if (!rvcode) return initialData;

      const [pages, members] = await Promise.all([
        fetchBoardPages(rvcode),
        fetchBoardMembers(rvcode)
      ]);

      return { pages, members };
    },
    initialData,
    enabled: !!rvcode,
  });

  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const [fullMemberIndex, setFullMemberIndex] = useState(-1);

  const getPagesLabels = (): string[] => {
    if (!boardsData?.pages || !boardsData.pages.length) return [];

    return boardsData.pages.map(page => page.title[language]);
  };

  const getBoardsPerTitle = (): IBoardPerTitle[] => {
    if (!boardsData?.pages || !boardsData.pages.length) return [];
    if (!boardsData?.members || !boardsData.members.length) return [];

    return boardsData.pages.map(page => {
      const title = page.title[language];
      const description = page.content[language];

      const pageMembers = boardsData.members.filter((member) => {
        const pluralRoles = member.roles.map((role) => `${role}s`);
        return member.roles.includes(page.page_code) || pluralRoles.includes(page.page_code);
      });

      return {
        title,
        description,
        members: pageMembers
      };
    });
  };

  const handleGroupToggle = (index: number): void => {
    setActiveGroupIndex(prev => prev === index ? 0 : index);
  };

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} >` }
  ];

  return (
    <main className='boards'>
      <PageTitle title={t('pages.boards.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.boards.title')} />

      <div className='boards-title'>
        <h1 className='boards-title-text'>{t('pages.boards.title')}</h1>
        {boardsData?.members && boardsData.members.length > 0 && (
          boardsData.members.length > 1 ? (
            <div className='boards-title-count'>{boardsData.members.length} {t('common.members')}</div>
          ) : (
            <div className='boards-title-count'>{boardsData.members.length} {t('common.member')}</div>
          ))}
      </div>

      <div className={`boards-content content-transition ${isUpdating ? 'updating' : ''}`}>
        <BoardsSidebar 
          t={t} 
          groups={getPagesLabels()} 
          activeGroupIndex={activeGroupIndex} 
          onSetActiveGroupCallback={handleGroupToggle} 
        />
        <div className='boards-content-groups'>
          {getBoardsPerTitle().map((boardPerTitle, index) => (
            <div key={index} className='boards-content-groups-group'>
              <div 
                className='boards-content-groups-group-title' 
                onClick={(): void => activeGroupIndex === index ? handleGroupToggle(-1) : handleGroupToggle(index)}
              >
                <h2>{boardPerTitle.title}</h2>
                <img 
                  className='boards-content-groups-group-caret' 
                  src={activeGroupIndex === index ? '/icons/caret-up-red.svg' : '/icons/caret-down-red.svg'} 
                  alt={activeGroupIndex === index ? 'Caret up icon' : 'Caret down icon'} 
                />
              </div>
              <div className={`boards-content-groups-group-content ${activeGroupIndex === index && 'boards-content-groups-group-content-active'}`}>
                <div className='boards-content-groups-group-content-description'>
                  <ReactMarkdown>{boardPerTitle.description}</ReactMarkdown>
                </div>
                <div className='boards-content-groups-group-content-grid'>
                  {boardPerTitle.members.map((member, index) => (
                    <BoardCard
                      key={index}
                      language={language}
                      t={t}
                      member={member}
                      fullCard={fullMemberIndex === index}
                      blurCard={fullMemberIndex !== -1 && fullMemberIndex !== index}
                      setFullMemberIndexCallback={(): void => fullMemberIndex !== index ? setFullMemberIndex(index) : setFullMemberIndex(-1)}
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