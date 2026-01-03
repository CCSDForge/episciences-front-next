import { Metadata } from 'next';
import { fetchSection, fetchSections, fetchSectionArticles } from '@/services/section';
import SectionDetailsClient from './SectionDetailsClient';
import { getLanguageFromParams } from '@/utils/language-utils';
import { ISection, PartialSectionArticle } from '@/types/section';
import { IArticle } from '@/types/article';

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

export default async function SectionDetailsPage({
  params
}: {
  params: { id: string; lang?: string; journalId: string }
}) {
  const language = getLanguageFromParams(params);
  const { journalId } = params;

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
    
    if (!journalId) {
      throw new Error('journalId is not defined');
    }
    
    // Fetch section details by ID (like volumes do)
    const rawSection = await fetchSection({ sid: params.id });

    // Format section data (similar to fetchSections formatting)
    const section: ISection = {
      id: rawSection.id,
      title: rawSection.title,
      description: rawSection.description,
      committee: rawSection.committee,
      articles: rawSection.articles || []
    };

    // Fetch articles for this section
    let articles: IArticle[] = [];
    if (section.articles && section.articles.length > 0) {
      // Extract paper IDs from the articles array
      const paperIds = section.articles.map((article: PartialSectionArticle) =>
        article.paperid
      ).filter(Boolean);

      if (paperIds.length > 0) {
        const fetchedArticles = await fetchSectionArticles(paperIds.map((id: number) => id.toString()));
        // Filter out null values
        articles = fetchedArticles.filter((article): article is IArticle => article !== null);
      }
    }
    
    return (
      <SectionDetailsClient 
        section={section}
        articles={articles}
        sectionId={params.id}
        lang={params.lang}
      />
    );
  } catch (error) {
    console.error(`Error fetching section ${params.id}:`, error);
    return (
      <div className="error-message">
        <h1>Section not found</h1>
        <p>The section you&apos;re looking for could not be found.</p>
      </div>
    );
  }
}
 