import { generateLanguageParamsForPage } from '@/utils/static-params-helper';

import { Metadata } from 'next';

import dynamic from 'next/dynamic';

import './Statistics.scss';

export async function generateStaticParams() {
  return generateLanguageParamsForPage('statistics');
}

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

export default function StatisticsPage() {
  return <StatisticsClient />;
} 