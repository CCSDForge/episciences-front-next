import { Metadata } from 'next';
import './Search.scss';
import dynamic from 'next/dynamic';

const SearchClient = dynamic(() => import('./SearchClient'), {
  loading: () => <div className="loader">Chargement...</div>,
});

export const metadata: Metadata = {
  title: 'Recherche',
  description: 'Rechercher des articles dans la revue',
};

export default async function SearchPage() {
  return <SearchClient />;
}
 