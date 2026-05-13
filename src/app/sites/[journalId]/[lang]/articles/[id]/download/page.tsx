import { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';
import { fetchArticle } from '@/services/article';
import { AvailableLanguage } from '@/utils/i18n';
import { logArticleProgress } from '@/utils/build-progress';
import { connection } from 'next/server';
import { getPdfProxyUrl, generateArticleFilename } from '@/utils/pdf';

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

export default async function DownloadPage(props: DownloadPageProps) {
  await connection();

  const params = await props.params;
  logArticleProgress(params.id, params.lang, 'download');

  const article = await fetchArticle(params.id, params.journalId);

  if (!article || !article.pdfLink) {
    notFound();
  }

  const filename = generateArticleFilename(params.journalId, article.id, article.title);

  redirect(getPdfProxyUrl(article.pdfLink, 'attachment', filename));
}
