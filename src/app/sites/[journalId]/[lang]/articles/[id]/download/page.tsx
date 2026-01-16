import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { fetchArticle } from '@/services/article';
import { AvailableLanguage } from '@/utils/i18n';
import { logArticleProgress } from '@/utils/build-progress';
import { connection } from 'next/server';
import { getPdfProxyUrl } from '@/utils/pdf';

interface DownloadPageProps {
  params: Promise<{
    journalId: string;
    lang: AvailableLanguage;
    id: string;
  }>;
}

export async function generateMetadata(props: DownloadPageProps): Promise<Metadata> {
  const params = await props.params;
  const article = await fetchArticle(params.id, params.journalId);

  if (!article) {
    return {
      title: 'Article not found',
    };
  }

  return {
    title: `Téléchargement - ${article.title}`,
    description: `Téléchargement de l'article: ${article.title}`,
  };
}

/**
 * Generate a safe filename for PDF download
 * Format: article_[id]_[sanitized_title].pdf
 */
function generatePdfFilename(articleId: string, title: string): string {
  // Sanitize title: keep only alphanumeric, spaces, and hyphens
  const sanitizedTitle = title
    .toLowerCase()
    .replace(/[^\w\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .substring(0, 50); // Limit length

  return `article_${articleId}_${sanitizedTitle}.pdf`;
}

/**
 * Download page - Server-side redirect to PDF proxy
 *
 * This page serves as a tracking endpoint for Apache logs.
 * It immediately redirects to the PDF download URL with Content-Disposition: attachment.
 * The browser will download the file without changing the page.
 */
export default async function DownloadPage(props: DownloadPageProps) {
  await connection();

  const params = await props.params;
  // Log build progress for statistics
  logArticleProgress(params.id, params.lang, 'download');

  const article = await fetchArticle(params.id, params.journalId);

  if (!article || !article.pdfLink) {
    notFound();
  }

  // Generate descriptive filename
  const filename = generatePdfFilename(article.id.toString(), article.title);

  // Redirect to PDF proxy with attachment disposition and custom filename
  // The browser will download the file without navigating away from the current page
  redirect(getPdfProxyUrl(article.pdfLink, 'attachment', filename));
}
