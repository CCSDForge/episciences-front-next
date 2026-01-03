'use client';

import { useState, useEffect } from 'react';
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
  tableOfContentsLabel
}: BoardsClientProps): JSX.Element {
  const { t, i18n } = useTranslation();
  
  // Use the prop lang for rendering to ensure consistency with SSR
  // Fallback to i18n language or Redux state if lang prop is missing (should not happen in proper usage)
  const reduxLanguage = useAppSelector(state => state.i18nReducer.language);
  const currentLang = (lang || reduxLanguage || 'en') as 'en' | 'fr'; 

  // Synchroniser la langue avec le paramètre de l'URL pour les futures interactions client
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);

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

    // Use currentLang for consistent rendering
    return boardsData.pages.map(page => page.title[currentLang] || page.title['en'] || '');
  };

  const getBoardsPerTitle = (): IBoardPerTitle[] => {
    if (!boardsData?.pages || !boardsData.pages.length) return [];
    if (!boardsData?.members || !boardsData.members.length) return [];

    return boardsData.pages.map(page => {
      // Use currentLang for consistent rendering
      const title = page.title[currentLang] || page.title['en'] || '';
      const description = page.content[currentLang] || page.content['en'] || '';

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
    { 
      path: '/', 
      label: breadcrumbLabels 
        ? `${breadcrumbLabels.home} >` 
        : `${t('pages.home.title')} >` 
    }
  ];

  return (
    <main className='boards'>
      <PageTitle title={breadcrumbLabels?.boards || t('pages.boards.title')} />

      <Breadcrumb parents={[        { path: '/', label: breadcrumbLabels?.home || t('pages.home.title') }      ]} crumbLabel={breadcrumbLabels?.boards || t('pages.boards.title')} lang={lang} />

      <div className='boards-title'>
        <h1 className='boards-title-text'>{breadcrumbLabels?.boards || t('pages.boards.title')}</h1>
        {boardsData?.members && boardsData.members.length > 0 && (
          boardsData.members.length > 1 ? (
            <div className='boards-title-count'>{boardsData.members.length} {membersCountLabels?.members || t('common.members')}</div>
          ) : (
            <div className='boards-title-count'>{boardsData.members.length} {membersCountLabels?.member || t('common.member')}</div>
          ))}
      </div>

      <div className={`boards-content content-transition ${isUpdating ? 'updating' : ''}`}>
        <BoardsSidebar 
          t={t} 
          groups={getPagesLabels()} 
          activeGroupIndex={activeGroupIndex} 
          onSetActiveGroupCallback={handleGroupToggle}
          tableOfContentsLabel={tableOfContentsLabel}
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
                      language={currentLang}
                      t={t}
                      member={member}
                      fullCard={fullMemberIndex === index}
                      blurCard={fullMemberIndex !== -1 && fullMemberIndex !== index}
                      setFullMemberIndexCallback={(): void => fullMemberIndex !== index ? setFullMemberIndex(index) : setFullMemberIndex(-1)}
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