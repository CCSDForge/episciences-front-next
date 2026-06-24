import { cache } from 'react';
import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchSection, fetchSectionArticles } from '@/services/section';
import { getJournalByCode } from '@/services/journal';
import SectionDetailsClient from './SectionDetailsClient';
import { getLanguageFromParams } from '@/utils/language-utils';
import { ISection, PartialSectionArticle } from '@/types/section';
import { IArticle } from '@/types/article';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getLocalizedContent } from '@/utils/content-fallback';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';

const getCachedJournal = cache((journalId: string) =>
  getJournalByCode(journalId).catch(() => null)
);

// Section details change infrequently - long revalidation time
// Use on-demand revalidation API for updates
export const revalidate = 604800; // 7 days

export async function generateStaticParams() {
  return [];
}

export async function generateMetadata(props: {
  params: Promise<{ id: string; lang?: string; journalId: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { id, journalId } = params;
  const language = getLanguageFromParams(params);
  try {
    if (id === 'no-sections-found') {
      return {
        title: 'No sections found',
        description: 'No sections available for this journal',
      };
    }

    const section = await fetchSection({ sid: id, rvcode: journalId });
    if (!section) {
      return {
        title: 'Section Details',
        description: 'Section details page',
        alternates: generateSeoAlternates(journalId, language, `/sections/${id}`),
      };
    }
    const sectionTitle = section.title?.en || section.title?.fr || `Section ${id}`;

    return {
      title: `${sectionTitle} | Episciences`,
      description:
        section.description?.en || section.description?.fr || `Articles in ${sectionTitle}`,
      alternates: generateSeoAlternates(journalId, language, `/sections/${id}`),
    };
  } catch (error) {
    logger.error(`Error generating metadata for section ${id}:`, error);
    return {
      title: 'Section Details',
      description: 'Section details page',
      alternates: generateSeoAlternates(journalId, language, `/sections/${id}`),
    };
  }
}

export default async function SectionDetailsPage(props: {
  params: Promise<{ id: string; lang?: string; journalId: string }>;
}) {
  const params = await props.params;
  const language = getLanguageFromParams(params);
  const { journalId } = params;
  const translationsPromise = getServerTranslations(language);

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

    if (!/^\d+$/.test(params.id)) {
      notFound();
    }

    const [rawSection, activeJournal] = await Promise.all([
      fetchSection({ sid: params.id, rvcode: journalId }),
      getCachedJournal(journalId),
    ]);

    // Tier 1: null means the journal-scoped API returned no result
    if (!rawSection) {
      notFound();
    }

    // Tier 2: if the API returned a section belonging to another journal, redirect.
    // Fail-closed: if rvid is present but the journal lookup failed, block rather than skip.
    if (rawSection.rvid !== undefined) {
      if (!activeJournal || rawSection.rvid !== activeJournal.id) {
        logger.warn('Cross-journal section access blocked', {
          reason: 'section-wrong-journal',
          resourceType: 'section',
          resourceId: params.id,
          sectionRvid: rawSection.rvid,
          requestedJournalRvid: activeJournal?.id,
        });
        notFound();
      }
    }

    // Format section data (similar to fetchSections formatting)
    const section: ISection = {
      id: rawSection.id,
      rvid: rawSection.rvid,
      title: rawSection.title,
      description: rawSection.description,
      committee: rawSection.committee,
      articles: rawSection.articles || [],
    };

    // Fetch articles for this section
    let articles: IArticle[] = [];
    if (section.articles && section.articles.length > 0) {
      // Extract paper IDs from the articles array
      const paperIds = section.articles
        .map((article: PartialSectionArticle) => article.paperid)
        .filter(Boolean);

      if (paperIds.length > 0) {
        const fetchedArticles = await fetchSectionArticles(
          paperIds.map((id: number) => id.toString()),
          journalId,
          params.id
        );
        // Filter out null values
        articles = fetchedArticles.filter((article): article is IArticle => article !== null);
      }
    }

    const translations = await translationsPromise;
    const breadcrumbLabels = {
      home: t('pages.home.title', translations),
      content: t('common.content', translations),
      sections: t('pages.sections.title', translations),
    };

    // Calculate title and description server-side to prevent hydration mismatch
    const sectionTitle =
      getLocalizedContent(section.title, language).value || `Section ${params.id}`;
    const sectionDescription = getLocalizedContent(section.description, language).value || '';

    return (
      <SectionDetailsClient
        section={section}
        articles={articles}
        sectionId={params.id}
        lang={params.lang}
        sectionTitle={sectionTitle}
        sectionDescription={sectionDescription}
        breadcrumbLabels={breadcrumbLabels}
      />
    );
  } catch (error) {
    if (error instanceof Error && 'digest' in error) throw error;
    logger.error(`Error fetching section ${params.id}:`, error);
    throw error;
  }
}
