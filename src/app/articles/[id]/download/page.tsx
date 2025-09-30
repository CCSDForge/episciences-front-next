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
  // Si un ID spécifique est fourni, ne générer que cet article
  if (process.env.ONLY_BUILD_ARTICLE_ID) {
    return [{ id: process.env.ONLY_BUILD_ARTICLE_ID }];
  }
  
  // Sinon, continuer avec la génération complète de tous les articles
  try {
    const { fetchArticles } = await import('@/services/article');
    const { data: articles } = await fetchArticles({ 
      rvcode: process.env.NEXT_PUBLIC_RVCODE || '',
      page: 1,
      itemsPerPage: 5000
    });
    
    if (!articles || !articles.length) {
      return [{ id: "no-articles-found" }];
    }
    
    console.log(`Génération des pages de téléchargement pour ${articles.length} articles.`);
    return articles.map((article: any) => ({
      id: article?.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params for download pages:', error);
    return [{ id: 'no-articles-found' }];
  }
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