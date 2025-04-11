'use client';

import { TFunction } from 'i18next';

import './SectionDetailsSidebar.scss';

interface ISectionDetailsSidebarProps {
  t: TFunction<"translation", undefined>
  articlesCount: number;
}

export default function SectionDetailsSidebar({ t, articlesCount }: ISectionDetailsSidebarProps): JSX.Element {
  return (
    <div className='sectionDetailsSidebar'>
      <div className='sectionDetailsSidebar-count'>
        {articlesCount > 1 ? `${articlesCount} ${t('common.articles')}` : `${articlesCount} ${t('common.article')}`}
      </div>
    </div>
  )
} 