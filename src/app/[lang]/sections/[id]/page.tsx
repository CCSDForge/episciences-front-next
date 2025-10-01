import { Metadata } from 'next';
import { fetchSection, fetchSections, fetchSectionArticles } from '@/services/section';
import SectionDetailsClient from './SectionDetailsClient';
import { getLanguageFromParams } from '@/utils/language-utils';
import { combineWithLanguageParams } from '@/utils/static-params-helper';

export async function generateMetadata({ params }: { params: { id: string; lang?: string } }): Promise<Metadata> {
  try {
    if (params.id === 'no-sections-found') {
      return {
        title: 'No sections found',
        description: 'No sections available for this journal',
      };
    }

    const section = await fetchSection({ sid: params.id });
    const sectionTitle = section.title?.en || section.title?.fr || `Section ${params.id}`;
    
    return {
      title: `${sectionTitle} | Episciences`,
      description: section.description?.en || section.description?.fr || `Articles in ${sectionTitle}`,
    };
  } catch (error) {
    console.error(`Error generating metadata for section ${params.id}:`, error);
    return {
      title: 'Section Details',
      description: 'Section details page',
    };
  }
}

export async function generateStaticParams() {
  try {
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (!rvcode) {
      console.error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
      return [{ id: 'no-sections-found' }];
    }

    // Fetch all sections to get their IDs (similar to volumes)
    let allSections = [];
    let page = 1;
    let hasMore = true;

    while (hasMore) {
      const sectionsData = await fetchSections({
        rvcode,
        page,
        itemsPerPage: 100
      });
      
      allSections.push(...sectionsData.data);
      
      // Check if there are more pages
      hasMore = sectionsData.data.length === 100;
      page++;
      
      // Safety break to avoid infinite loop
      if (page > 50) break;
    }

    if (!allSections || allSections.length === 0) {
      return [{ id: 'no-sections-found' }];
    }

    console.log(`Generating static params for ${allSections.length} sections`);

    // Generate params for each section ID
    const sectionParams = allSections.map((section: any) => ({
      id: section.id.toString(),
    }));

    return combineWithLanguageParams(sectionParams);
  } catch (error) {
    console.error('Error generating static params for sections:', error);
    return combineWithLanguageParams([{ id: 'no-sections-found' }]);
  }
}

export default async function SectionDetailsPage({
  params
}: {
  params: { id: string; lang?: string }
}) {
  const language = getLanguageFromParams(params);
  try {
    // Check for placeholder ID
    if (params.id === 'no-sections-found') {
      return (
        <div className="error-message">
          <h1>No sections available</h1>
          <p>No sections are currently available for this journal.</p>
        </div>
      );
    }
    
    const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    
    if (!rvcode) {
      throw new Error('NEXT_PUBLIC_JOURNAL_RVCODE is not defined');
    }
    
    // Fetch section details by ID (like volumes do)
    const rawSection = await fetchSection({ sid: params.id });
    
    // Format section data (similar to fetchSections formatting)
    const section = {
      ...rawSection,
      id: rawSection.sid || rawSection.id,
      title: rawSection.titles || rawSection.title,
      description: rawSection.descriptions || rawSection.description,
      articles: rawSection.papers || rawSection.articles || []
    };
    
    // Fetch articles for this section
    let articles = [];
    if (section.articles && section.articles.length > 0) {
      // Extract paper IDs from the articles array
      const paperIds = section.articles.map((article: any) => 
        article.paperid || article.id || article.docid || article
      ).filter(Boolean);
      
      if (paperIds.length > 0) {
        articles = await fetchSectionArticles(paperIds.map(id => id.toString()));
      }
    }
    
    return (
      <SectionDetailsClient 
        section={section}
        articles={articles}
        sectionId={params.id}
      />
    );
  } catch (error) {
    console.error(`Error fetching section ${params.id}:`, error);
    return (
      <div className="error-message">
        <h1>Section not found</h1>
        <p>The section you're looking for could not be found.</p>
      </div>
    );
  }
} 