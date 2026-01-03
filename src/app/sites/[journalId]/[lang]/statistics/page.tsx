import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getServerTranslations, t } from '@/utils/server-i18n';
import './Statistics.scss';

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

type Props = {
  params: { journalId: string; lang: string };
};

export default async function StatisticsPage({ params }: Props) {
  const { lang } = params;
  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    statistics: t('pages.statistics.title', translations),
  };

  return <StatisticsClient lang={lang} breadcrumbLabels={breadcrumbLabels} />;
}