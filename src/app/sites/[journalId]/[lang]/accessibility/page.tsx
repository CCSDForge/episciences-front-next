import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { getServerTranslations, t as translate } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';
import { getFilteredJournals } from '@/utils/journal-filter';
import { acceptedLanguages, defaultLanguage } from '@/utils/language-utils';
import { generateSeoAlternates } from '@/utils/seo';
import { logger } from '@/lib/logger';
import JsonLd from '@/components/Meta/JsonLd';
import { generateWebPageJsonLd } from '@/utils/schema';

export const revalidate = false;

// Pre-generate accessibility page for all journals at build time
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
    title: translate('pages.accessibility.title', translations),
    description: translate('pages.accessibility.description', translations),
    alternates: generateSeoAlternates(journalId, lang, '/accessibility'),
  };
}

export default async function AccessibilityPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { journalId, lang } = params;
  const translations = await getServerTranslations(lang);

  const contentDir = path.join(process.cwd(), 'src/content/accessibility');
  const candidates = [lang, defaultLanguage].filter((v, i, a) => a.indexOf(v) === i);

  let content = '';
  try {
    for (const candidate of candidates) {
      const candidatePath = path.join(contentDir, `${candidate}.md`);
      if (fs.existsSync(candidatePath)) {
        content = fs.readFileSync(candidatePath, 'utf8');
        break;
      }
    }
    if (!content) {
      logger.warn(
        `[Accessibility] No content file found for candidates: ${candidates.join(', ')}`
      );
      content = translate('pages.accessibility.noContent', translations);
    }
  } catch (err) {
    logger.error(`[Accessibility] Error reading content:`, err);
    content = 'Error loading content.';
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/accessibility', translations),
    current: translate('pages.accessibility.title', translations),
  };

  return (
    <>
      <JsonLd data={generateWebPageJsonLd('WebPage', journalId, lang, '/accessibility', {
        name: translate('pages.accessibility.title', translations),
      })} />
      <MarkdownPageWithSidebar
        content={content}
        title={translate('pages.accessibility.title', translations)}
        isLoading={false}
        breadcrumbLabels={breadcrumbLabels}
        lang={lang}
        className="markdown-page"
      />
    </>
  );
}
