import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './About.scss';
import { fetchAboutPage } from '@/services/about';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

const AboutClient = dynamic(() => import('./AboutClient'));

// Stable editorial content - no ISR, fully static at build time
export const revalidate = false;

// Pre-generate about page for all journals at build time
export async function generateStaticParams() {
  const journals = getFilteredJournals();
  const params: { journalId: string; lang: string }[] = [];

  for (const journalId of journals) {
    for (const lang of acceptedLanguages) {
      params.push({ journalId, lang });
    }
  }

  return params;
}

export async function generateMetadata(props: {
  params: Promise<{ journalId: string; lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);
  return {
    title: t('pages.about.title', translations),
    description: t('pages.about.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/about'),
  };
}

export default async function AboutPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  let pageData = null;
  const { journalId, lang } = params;

  const translationsPromise = getServerTranslations(lang);

  try {
    if (journalId) {
      // Récupérer les données
      const rawData = await fetchAboutPage(journalId);
      if (rawData?.['hydra:member']?.[0]) {
        pageData = rawData['hydra:member'][0];
      } else {
        logger.warn(
          `[Build] About page content not found for journal "${journalId}" on API. It will be empty.`
        );
      }
    }
  } catch (error) {
    logger.warn(`[Build] Could not reach API for About page of journal "${journalId}".`);
  }

  const translations = await translationsPromise;
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    about: t('pages.about.title', translations),
  };

  return (
    <>
      <JsonLd
        data={generateWebPageJsonLd('AboutPage', journalId, lang, '/about', {
          name: t('pages.about.title', translations),
          lastReviewed: pageData?.date_updated,
        })}
      />
      <AboutClient initialPage={pageData} lang={lang} breadcrumbLabels={breadcrumbLabels} />
    </>
  );
}
