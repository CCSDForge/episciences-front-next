import { Metadata } from 'next';
import { fetchArticle } from '@/services/article';
import dynamicImport from 'next/dynamic';

const ArticleDetailsPreviewClient = dynamicImport(() => import('./ArticleDetailsPreviewClient'), { ssr: false });

interface ArticleDetailsPreviewPageProps {
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
    
    console.log(`Génération des pages de prévisualisation pour ${articles.length} articles.`);
    return articles.map((article: any) => ({
      id: article?.id.toString(),
    }));
  } catch (error) {
    console.error('Error generating static params for preview pages:', error);
    return [{ id: 'no-articles-found' }];
  }
}

export async function generateMetadata({ params }: ArticleDetailsPreviewPageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Aperçu | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour l'aperçu d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? `${article.title} - Prévisualisation` : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur - Prévisualisation',
    };
  }
}

export default async function ArticleDetailsPreviewPage({ params }: ArticleDetailsPreviewPageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return (
        <div className="error-message">
          <h1>Aucun article disponible</h1>
          <p>Page placeholder pour l'aperçu d'articles</p>
        </div>
      );
    }

    const article = await fetchArticle(params.id);
    return <ArticleDetailsPreviewClient article={article} />;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id} pour la prévisualisation:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement de la prévisualisation</h1>
        <p>Impossible de charger les données de l'article pour la prévisualisation.</p>
      </div>
    );
  }
} 