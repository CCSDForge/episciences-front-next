import { Metadata } from 'next';
import { getTranslations } from '@/utils/i18n';
import store from '@/store';

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations();
  const state = store.getState();
  const journalName = state.journalReducer.currentJournal?.name;

  return {
    title: `${t('pages.articles.title')} | ${journalName || ''}`,
    description: t('pages.articles.description'),
  };
}; 