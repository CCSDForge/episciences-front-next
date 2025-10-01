import { combineWithLanguageParams } from "@/utils/static-params-helper";
import { Metadata } from 'next';
import { fetchArticle } from '@/services/article';
import dynamicImport from 'next/dynamic';

const ArticleDetailsNoticeClient = dynamicImport(() => import('./ArticleDetailsNoticeClient'), { ssr: false });

interface ArticleDetailsNoticePageProps {
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

export async function generateMetadata({ params }: ArticleDetailsNoticePageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: `Aucun article - Notice | ${process.env.NEXT_PUBLIC_JOURNAL_NAME}`,
        description: "Page placeholder pour les notices d'articles"
      };
    }
    
    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? `${article.title} - Notice` : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur - Notice',
    };
  }
}

export default async function ArticleDetailsNoticePage({ params }: ArticleDetailsNoticePageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return (
        <div className="article-placeholder">
          <h1>Aucun article disponible</h1>
          <p>Aucun article n'est disponible pour ce journal actuellement.</p>
        </div>
      );
    }
    
    const article = await fetchArticle(params.id);
    return <ArticleDetailsNoticeClient article={article} />;
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id} pour la notice:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement de la notice</h1>
        <p>Impossible de charger les données de l'article pour la notice.</p>
      </div>
    );
  }
} 