import { Metadata } from 'next';

import dynamic from 'next/dynamic';

import './Statistics.scss';

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

type Props = {
  params: { journalId: string; lang: string };
};

export default function StatisticsPage({ params }: Props) {
  return <StatisticsClient lang={params.lang} />;
}