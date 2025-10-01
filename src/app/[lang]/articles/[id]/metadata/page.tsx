import { combineWithLanguageParams } from "@/utils/static-params-helper";
import { Metadata } from 'next';
import { fetchArticle, fetchArticleMetadata } from '@/services/article';
import dynamicImport from 'next/dynamic';
import { METADATA_TYPE } from '@/utils/article';

const ArticleDetailsMetadataClient = dynamicImport(() => import('./ArticleDetailsMetadataClient'), { ssr: false });

interface ArticleDetailsMetadataPageProps {
  params: {
    id: string;
  };
}

export async function generateMetadata({ params }: ArticleDetailsMetadataPageProps): Promise<Metadata> {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return {
        title: 'Aucun article disponible - Métadonnées',
      };
    }

    const article = await fetchArticle(params.id);
    return {
      title: article?.title ? `${article.title} - Métadonnées` : 'Article non trouvé',
    };
  } catch (error) {
    console.error(`Erreur lors de la récupération des métadonnées de l'article ${params.id}:`, error);
    return {
      title: 'Erreur - Métadonnées',
    };
  }
}

export async function generateStaticParams() {
  // Reuse the same function as parent (articles/[id]/page.tsx)
  const parentModule = await import('../page');
  const parentParams = await parentModule.generateStaticParams();
  return parentParams;
}

export default async function ArticleDetailsMetadataPage({ params }: ArticleDetailsMetadataPageProps) {
  try {
    // Vérifier si nous avons un ID factice
    if (params.id === 'no-articles-found') {
      return (
        <div className="error-message">
          <h1>Aucun article disponible</h1>
          <p>Page placeholder pour les métadonnées d'articles</p>
        </div>
      );
    }

    const [article, metadataCSL, metadataBibTeX] = await Promise.all([
      fetchArticle(params.id),
      fetchArticleMetadata({ 
        rvcode: process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '', 
        paperid: params.id,
        type: METADATA_TYPE.CSL
      }),
      fetchArticleMetadata({ 
        rvcode: process.env.NEXT_PUBLIC_JOURNAL_RVCODE || '', 
        paperid: params.id,
        type: METADATA_TYPE.BIBTEX
      })
    ]);

    return (
      <ArticleDetailsMetadataClient 
        article={article} 
        metadataCSL={metadataCSL || undefined}
        metadataBibTeX={metadataBibTeX || undefined}
      />
    );
  } catch (error) {
    console.error(`Erreur lors de la récupération de l'article ${params.id} pour les métadonnées:`, error);
    return (
      <div className="error-message">
        <h1>Erreur lors du chargement des métadonnées</h1>
        <p>Impossible de charger les données de l'article pour les métadonnées.</p>
      </div>
    );
  }
} 