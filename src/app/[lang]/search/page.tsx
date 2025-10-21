import { Metadata } from 'next';
import dynamicImport from 'next/dynamic';
import './Search.scss';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";

const SearchClient = dynamicImport(() => import('./SearchClient'), );

export const metadata: Metadata = {
  title: 'Recherche',
};

export async function generateStaticParams() {
  return generateLanguageParamsForPage('search');
}

export default async function SearchPage({ params }: { params: { lang: string } }) {
  const lang = params.lang || 'en';
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
        lang={lang}
      />
    );
  } catch (error) {
    console.error('Error preparing search page:', error);
    return <div>Error loading search page</div>;
  }
} 