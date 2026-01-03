import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './News.scss';

const NewsClient = dynamic(() => import('./NewsClient'));

export const metadata: Metadata = {
  title: 'Actualités',
  description: 'Dernières actualités de la revue',
};

export default function NewsPage() {
  return <NewsClient />;
} 