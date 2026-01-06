import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { fetchArticle } from '@/services/article';
import { AvailableLanguage } from '@/utils/i18n';
import { logArticleProgress } from '@/utils/build-progress';
import { connection } from 'next/server';
import ArticleDetailsDownloadClient from './ArticleDetailsDownloadClient';

interface DownloadPageProps {
  params: Promise<{
    lang: AvailableLanguage;
    id: string;
  }>;
}

export async function generateMetadata(props: DownloadPageProps): Promise<Metadata> {
  const params = await props.params;
  const article = await fetchArticle(params.id);

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
  // Log build progress
  logArticleProgress(params.id, params.lang, 'download');

  const article = await fetchArticle(params.id);

  if (!article || !article.pdfLink) {
    notFound();
  }

  return (
    <ArticleDetailsDownloadClient
      pdfUrl={article.pdfLink}
      articleTitle={article.title}
    />
  );
}
