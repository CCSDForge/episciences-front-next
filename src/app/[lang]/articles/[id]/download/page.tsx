import { combineWithLanguageParams } from "@/utils/static-params-helper";
import { Metadata } from 'next';
import { fetchArticle } from '@/services/article';
import dynamicImport from 'next/dynamic';

const ArticleDetailsDownloadClient = dynamicImport(() => import('./ArticleDetailsDownloadClient'), { ssr: false });

interface ArticleDetailsDownloadPageProps {
  params: {
    id: string;
  };
}

export async function generateStaticParams() {
  // Reuse the same function as parent (articles/[id]/page.tsx)
  const parentModule = await import('../page');
  const parentParams = await parentModule.generateStaticParams();
  return parentParams;
}

export async function generateMetadata({ params }: ArticleDetailsDownloadPageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Téléchargement | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour le téléchargement d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? `${article.title} - Téléchargement` : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur - Téléchargement',
    };
  }
}

export default async function ArticleDetailsDownloadPage({ params }: ArticleDetailsDownloadPageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return (
        <div className="error-message">
          <h1>Aucun article disponible</h1>
          <p>Page placeholder pour le téléchargement d'articles</p>
        </div>
      );
    }

    const article = await fetchArticle(params.id);
    return <ArticleDetailsDownloadClient article={article} />;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id} pour le téléchargement:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement du téléchargement</h1>
        <p>Impossible de charger les données de l'article pour le téléchargement.</p>
      </div>
    );
  }
} 