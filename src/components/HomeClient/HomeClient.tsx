'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import { HomeData } from '@/services/home';
import { useAppSelector } from '@/hooks/store';
import { HOMEPAGE_BLOCK, HOMEPAGE_LAST_INFORMATION_BLOCK, blocksConfiguration } from '@/config/homepage';
import { PATHS } from '@/config/paths';
import { VOLUME_TYPE } from '@/utils/volume';
import { IVolume } from '@/types/volume';
import { INews } from '@/types/news';
import IssuesSection from '@/components/HomeSections/IssuesSection/IssuesSection';
import JournalSection from '@/components/HomeSections/JournalSection/JournalSection';
import NewsSection from '@/components/HomeSections/NewsSection/NewsSection';
import PresentationSection from '@/components/HomeSections/PresentationSection/PresentationSection';
import StatisticsSection from '@/components/HomeSections/StatisticsSection/StatisticsSection';
import Swiper from '@/components/Swiper/Swiper';
import applyThemeVariables from '@/config/theme';
import '@/styles/pages/Home.scss';

interface HomeClientProps {
  homeData: HomeData;
  language: string;
}

export default function HomeClient({ homeData, language }: HomeClientProps): JSX.Element {
  const { t, i18n } = useTranslation();
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);

  // Extraire les données nécessaires du homeData avec des valeurs par défaut sécurisées
  const { 
    aboutPage = { content: {} }, 
    articles = { data: [] }, 
    news = { data: [] }, 
    members = [], 
    stats = [], 
    indexation = { content: {} }, 
    issues = { data: [] }, 
    acceptedArticles = { data: [] }
  } = homeData || {};

  // Vérifier si un bloc doit être affiché ou non
  const getBlockRendering = (blockKey: HOMEPAGE_BLOCK) => {
    const config = blocksConfiguration().find((config) => config.key === blockKey);
    
    // Vérifier les variables d'environnement pour éventuellement désactiver certains blocs
    let envValue;
    switch (blockKey) {
      case HOMEPAGE_BLOCK.MEMBERS_CAROUSEL:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_MEMBERS_CAROUSEL_RENDER;
        break;
      case HOMEPAGE_BLOCK.SPECIAL_ISSUES:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_SPECIAL_ISSUES_RENDER;
        break;
      case HOMEPAGE_BLOCK.JOURNAL_INDEXATION:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_JOURNAL_INDEXATION_RENDER;
        break;
      case HOMEPAGE_BLOCK.LATEST_ARTICLES_CAROUSEL:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ARTICLES_CAROUSEL_RENDER;
        break;
      case HOMEPAGE_BLOCK.LATEST_NEWS_CAROUSEL:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_NEWS_CAROUSEL_RENDER;
        break;
      case HOMEPAGE_BLOCK.LATEST_ACCEPTED_ARTICLES_CAROUSEL:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_LATEST_ACCEPTED_ARTICLES_CAROUSEL_RENDER;
        break;
      case HOMEPAGE_BLOCK.STATS:
        envValue = process.env.NEXT_PUBLIC_JOURNAL_HOMEPAGE_STATS_RENDER;
        break;
    }
    
    if (envValue === 'false') {
      return { ...config, render: false };
    }
    
    return config;
  };

  // Créer un objet lastInformation valide pour PresentationSection
  const lastInformation = useMemo(() => {
    if (news?.data?.[0]) {
      return {
        type: HOMEPAGE_LAST_INFORMATION_BLOCK.LAST_NEWS,
        information: news.data[0] as INews
      };
    }
    return undefined;
  }, [news]);

  // Préparer les données pour le rendu
  const {
    aboutContent,
    validArticles,
    validNews,
    shouldRenderArticles,
    shouldRenderNews,
    shouldRenderMembers,
    shouldRenderStats,
    shouldRenderIndexation,
    shouldRenderIssues,
    validAcceptedArticles,
    shouldRenderAcceptedArticles,
  } = useMemo(() => {
    // Filtrer les articles valides
    const validArticles = articles?.data?.filter(article => !!article && !!article.id) || [];
    
    // Préparer les données de news
    const validNews = news?.data || [];
    
    // Filtrer les articles acceptés valides
    const validAcceptedArticles = acceptedArticles?.data?.filter(article => !!article && !!article.id) || [];
    
    // Vérifier si chaque section doit être affichée
    const articlesConfig = getBlockRendering(HOMEPAGE_BLOCK.LATEST_ARTICLES_CAROUSEL);
    const shouldRenderArticles = articlesConfig?.render && validArticles.length > 0;
    
    const newsConfig = getBlockRendering(HOMEPAGE_BLOCK.LATEST_NEWS_CAROUSEL);
    const shouldRenderNews = newsConfig?.render && validNews.length > 0;
    
    const membersConfig = getBlockRendering(HOMEPAGE_BLOCK.MEMBERS_CAROUSEL);
    const shouldRenderMembers = membersConfig?.render && members && Array.isArray(members) && members.length > 0;
    
    const statsConfig = getBlockRendering(HOMEPAGE_BLOCK.STATS);
    const shouldRenderStats = statsConfig?.render && stats && Array.isArray(stats) && stats.length > 0;
    
    const indexationConfig = getBlockRendering(HOMEPAGE_BLOCK.JOURNAL_INDEXATION);
    const shouldRenderIndexation = indexationConfig?.render && !!indexation?.content;
    
    const issuesConfig = getBlockRendering(HOMEPAGE_BLOCK.SPECIAL_ISSUES);
    const shouldRenderIssues = issuesConfig?.render && issues && issues.data && issues.data.length > 0;
    
    const acceptedArticlesConfig = getBlockRendering(HOMEPAGE_BLOCK.LATEST_ACCEPTED_ARTICLES_CAROUSEL);
    const shouldRenderAcceptedArticles = acceptedArticlesConfig?.render && validAcceptedArticles.length > 0;
    
    return {
      aboutContent: aboutPage?.content,
      validArticles,
      validNews,
      shouldRenderArticles,
      shouldRenderNews,
      shouldRenderMembers,
      shouldRenderStats,
      shouldRenderIndexation,
      shouldRenderIssues,
      validAcceptedArticles,
      shouldRenderAcceptedArticles
    };
  }, [
    aboutPage, 
    articles, 
    news, 
    members, 
    stats, 
    indexation, 
    issues, 
    acceptedArticles
  ]);

  // Appliquer les variables de thème
  useEffect(() => {
    applyThemeVariables();
  }, []);

  return (
    <main className='home'>
      <h1 className='home-title'>{t('pages.home.title')}</h1>
      <PresentationSection
        language={language}
        t={t}
        aboutContent={aboutContent}
        lastInformation={lastInformation} />
      {shouldRenderArticles && (
        <>
          <div className='home-subtitle'>
            <h2>{t('pages.home.blocks.articles.subtitle')}</h2>
            <Link href={PATHS.articles} prefetch={false}>
              <div className='home-subtitle-all'>
                <div className='home-subtitle-all-text'>{t('pages.home.blocks.articles.see')}</div>
                <img src='/icons/caret-right-grey.svg' alt='Caret right icon' />
              </div>
            </Link>
          </div>
          <Swiper 
            id='articles-swiper' 
            type='article' 
            language={language} 
            t={t} 
            slidesPerView={3} 
            slidesPerGroup={3} 
            cards={validArticles}
          />
        </>
      )}
      {shouldRenderNews && (
        <>
          <div className='home-subtitle'>
            <h2>{t('pages.home.blocks.news.subtitle')}</h2>
            <Link href={PATHS.news} prefetch={false}>
              <div className='home-subtitle-all'>
                <div className='home-subtitle-all-text'>{t('pages.home.blocks.news.see')}</div>
                <img src='/icons/caret-right-grey.svg' alt='Caret right icon' />
              </div>
            </Link>
          </div>
          <NewsSection language={language} t={t} news={validNews} />
        </>
      )}
      {shouldRenderMembers && (
        <>
          <div className='home-subtitle'>
            <h2>{t('pages.home.blocks.members.subtitle')}</h2>
            <Link href={PATHS.boards} prefetch={false}>
              <div className='home-subtitle-all'>
                <div className='home-subtitle-all-text'>{t('pages.home.blocks.members.see')}</div>
                <img src='/icons/caret-right-grey.svg' alt='Caret right icon' />
              </div>
            </Link>
          </div>
          <Swiper 
            id='boards-swiper' 
            type='board' 
            language={language} 
            t={t} 
            slidesPerView={4} 
            slidesPerGroup={3} 
            cards={members || []}
          />
        </>
      )}
      {shouldRenderStats && (
        <StatisticsSection t={t} i18n={i18n} stats={stats || []} />
      )}
      {shouldRenderIndexation && indexation && (
        <>
          <h2 className='home-subtitle'>{t('pages.home.blocks.indexation.subtitle')}</h2>
          <JournalSection language={language} content={indexation.content} />
        </>
      )}
      {shouldRenderIssues && issues && (
        <>
          <div className='home-subtitle'>
            <h2>{t('pages.home.blocks.specialIssues.subtitle')}</h2>
            <Link href={`${PATHS.volumes}?type=${VOLUME_TYPE.SPECIAL_ISSUE}`} prefetch={false}>
              <div className='home-subtitle-all'>
                <div className='home-subtitle-all-text'>{t('pages.home.blocks.specialIssues.see')}</div>
                <img src='/icons/caret-right-grey.svg' alt='Caret right icon' />
              </div>
            </Link>
          </div>
          <IssuesSection
            language={language}
            t={t}
            issues={issues.data || []}
            currentJournal={currentJournal || null}
          />
        </>
      )}
      {shouldRenderAcceptedArticles && (
        <>
          <div className='home-subtitle'>
            <h2>{t('pages.home.blocks.articlesAccepted.subtitle')}</h2>
            <Link href={PATHS.articlesAccepted} prefetch={false}>
              <div className='home-subtitle-all'>
                <div className='home-subtitle-all-text'>{t('pages.home.blocks.articlesAccepted.see')}</div>
                <img src='/icons/caret-right-grey.svg' alt='Caret right icon' />
              </div>
            </Link>
          </div>
          <Swiper 
            id='articles-accepted-swiper' 
            type='article-accepted' 
            language={language} 
            t={t} 
            slidesPerView={3} 
            slidesPerGroup={3} 
            cards={validAcceptedArticles}
          />
        </>
      )}
    </main>
  );
} 