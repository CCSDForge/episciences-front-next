import { Metadata } from 'next';

import dynamic from 'next/dynamic';

import './Statistics.scss';

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

export default function StatisticsPage() {
  return <StatisticsClient />;
} 
 