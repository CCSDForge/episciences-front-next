import React from 'react';
import { fetchArticles } from '@/services/article';
import { FetchedArticle } from '@/utils/article';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  const { data: articles } = await fetchArticles({ 
    rvcode: process.env.NEXT_PUBLIC_RVCODE || '',
    page: 1,
    itemsPerPage: 1000
  });
  
  if (!articles || !articles.length) {
    // Ajouter au moins un ID factice pour que Next.js puisse générer une page
    return [{ id: "no-articles-found" }];
  }
  
  return articles.map((article: FetchedArticle) => ({
    id: article?.id.toString(),
  }));
}

export default function ArticleLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
} 