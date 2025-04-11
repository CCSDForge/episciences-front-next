import { Metadata } from 'next';
import { fetchSections } from '@/services/section';
import SectionsClient from '../SectionsClient';

export const metadata: Metadata = {
  title: 'Sections',
};

const SECTIONS_PER_PAGE = 10;

export async function generateStaticParams() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (!rvcode) {
      console.error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
      return [{ id: 'section-placeholder' }];  // Valeur par défaut
    }

    // Fetch first page to get total count
    const firstPage = await fetchSections({
      rvcode,
      page: 1,
      itemsPerPage: SECTIONS_PER_PAGE
    });

    const totalPages = Math.ceil(firstPage.totalItems / SECTIONS_PER_PAGE);
    
    // Si aucune section trouvée, retourne au moins une page par défaut
    if (totalPages === 0) {
      return [{ id: 'section-placeholder' }];
    }
    
    // Generate array of page numbers
    return Array.from({ length: totalPages }, (_, i) => ({
      id: (i + 1).toString()
    }));
  } catch (error) {
    console.error('Error generating static params for sections:', error);
    return [{ id: 'section-placeholder' }];  // Valeur par défaut en cas d'erreur
  }
}

export default async function SectionsPage({
  params
}: {
  params: { id: string }
}) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-sections-found') {
      return <div className="section-placeholder">
        <h1>Aucune section disponible</h1>
        <p>Aucune section n'est disponible pour ce journal actuellement.</p>
      </div>;
    }
    
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    const page = parseInt(params.id, 10);
    
    const sectionsData = await fetchSections({
      rvcode,
      page,
      itemsPerPage: SECTIONS_PER_PAGE
    });
    
    return (
      <SectionsClient 
        initialSections={sectionsData} 
        initialPage={page}
      />
    );
  } catch (error) {
    console.error(`Erreur lors de la récupération des sections (page ${params.id}):`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement des sections</h1>
        <p>Impossible de charger les données des sections.</p>
      </div>
    );
  }
} 