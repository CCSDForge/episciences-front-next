import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { connection } from 'next/server';
import './Statistics.scss';

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

export const dynamic = 'force-dynamic';
export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

type Props = {
  params: Promise<{ journalId: string; lang: string }>;
};

export default async function StatisticsPage(props: Props) {
  await connection();

  const params = await props.params;
  const { lang } = params;
  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    statistics: t('pages.statistics.title', translations),
  };

  return <StatisticsClient lang={lang} breadcrumbLabels={breadcrumbLabels} />;
}