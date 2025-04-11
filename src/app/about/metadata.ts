import { Metadata } from 'next';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';

export const generateMetadata = async (): Promise<Metadata> => {
  const { t } = useTranslation();
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);

  return {
    title: `${t('pages.about.title')} | ${journalName ?? ''}`,
  };
}; 