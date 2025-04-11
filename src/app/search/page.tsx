import { Metadata } from 'next';
import { fetchSearchResults } from '@/services/search';
import SearchClient from './SearchClient';
import './Search.scss';
import { redirect } from 'next/navigation';
import { PATHS } from '@/config/paths';

export const metadata: Metadata = {
  title: 'Recherche',
};

export async function generateStaticParams() {
  // Pour le mode Full Static, on génère une seule page de recherche vide
  // La recherche effective sera effectuée côté client
  return [{}];
}

export const dynamic = 'force-static';

export default async function SearchPage() {
  try {
    // Pour la génération statique, on pré-remplit avec une recherche vide
    // La vraie recherche sera effectuée côté client
    const emptySearchResults = {
      data: [],
      totalItems: 0,
      range: {
        types: [],
        years: [],
        volumes: { fr: [], en: [] },
        sections: { fr: [], en: [] },
        authors: []
      }
    };
    
    return (
      <SearchClient 
        initialSearchResults={emptySearchResults} 
        initialSearch=""
        initialPage={1}
      />
    );
  } catch (error) {
    console.error('Error preparing search page:', error);
    return <div>Error loading search page</div>;
  }
} 