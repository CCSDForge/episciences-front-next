import { Metadata } from 'next';
import fs from 'fs';
import path from 'path';
import { getServerTranslations, t as translate } from '@/utils/server-i18n';
import { getBreadcrumbHierarchy } from '@/utils/breadcrumbs';
import MarkdownPageWithSidebar from '@/components/MarkdownPageWithSidebar/MarkdownPageWithSidebar';

export const revalidate = false;

export async function generateMetadata(props: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const params = await props.params;
  const { lang } = params;
  const translations = await getServerTranslations(lang);

  return {
    title: translate('pages.accessibility.title', translations),
    description: translate('pages.accessibility.description', translations),
  };
}

export default async function AccessibilityPage(props: {
  params: Promise<{ journalId: string; lang: string }>;
}) {
  const params = await props.params;
  const { lang } = params;
  const translations = await getServerTranslations(lang);
  
  const contentDir = path.join(process.cwd(), 'src/content/accessibility');
  const filename = lang === 'fr' ? 'fr.md' : 'en.md';
  const filePath = path.join(contentDir, filename);
  
  let content = '';
  try {
    if (fs.existsSync(filePath)) {
      content = fs.readFileSync(filePath, 'utf8');
    } else {
      console.warn(`[Accessibility] content file not found: ${filePath}`);
      content = translate('pages.accessibility.noContent', translations);
    }
  } catch (err) {
    console.error(`[Accessibility] Error reading file ${filePath}:`, err);
    content = 'Error loading content.';
  }

  const breadcrumbLabels = {
    parents: getBreadcrumbHierarchy('/accessibility', translations), 
    current: translate('pages.accessibility.title', translations),
  };

  return (
    <MarkdownPageWithSidebar
      content={content}
      title={translate('pages.accessibility.title', translations)}
      isLoading={false}
      breadcrumbLabels={breadcrumbLabels}
      lang={lang}
      className="markdown-page"
    />
  );
}
