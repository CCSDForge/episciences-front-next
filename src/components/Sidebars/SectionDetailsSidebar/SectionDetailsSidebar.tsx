'use client';

import { TFunction } from 'i18next';

import { IArticle } from '@/types/article';
import { IJournal } from '@/types/journal';
import { ISection } from '@/types/section';
import { AvailableLanguage } from '@/utils/i18n';
import './SectionDetailsSidebar.scss';

interface ISectionDetailsSidebarProps {
  language: AvailableLanguage;
  t: TFunction<"translation", undefined>;
  section?: ISection;
  articles?: IArticle[];
  currentJournal?: IJournal;
  sectionId: string;
}

export default function SectionDetailsSidebar({ 
  language, 
  t, 
  section, 
  articles = [], 
  currentJournal,
  sectionId 
}: ISectionDetailsSidebarProps): React.JSX.Element {
  
  return (
    <div className='sectionDetailsSidebar'>
      <div className='sectionDetailsSidebar-info'>
        <div className='sectionDetailsSidebar-info-type'>{t('common.section')}</div>
        <div className='sectionDetailsSidebar-info-count'>
          {articles.length > 1 ? `${articles.length} ${t('common.articles')}` : `${articles.length} ${t('common.article')}`}
        </div>
      </div>
    </div>
  );
} 