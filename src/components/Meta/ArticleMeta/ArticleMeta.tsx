import { Metadata } from 'next'
import { IArticle, IArticleAuthor } from '@/types/article'
import { IJournal } from '@/types/journal'
import { AvailableLanguage } from '@/utils/i18n'

interface IArticleMetaProps {
  language: AvailableLanguage;
  article?: IArticle;
  currentJournal?: IJournal;
  keywords: string[];
  authors: IArticleAuthor[];
}

export function generateArticleMetadata({ 
  language, 
  article, 
  currentJournal, 
  keywords, 
  authors 
}: IArticleMetaProps): Metadata {
  const metadataTitle = article?.title ? `${article.title}${currentJournal?.name ? ` | ${currentJournal.name}` : ''}` : undefined;

  const otherMetadata: Record<string, string | string[]> = {
    "citation_journal_title": currentJournal?.name || '',
    "citation_title": article?.title || '',
    "citation_publication_date": article?.publicationDate || '',
    "citation_doi": article?.doi || '',
    "citation_fulltext_world_readable": "",
    "citation_pdf_url": article?.pdfLink || '',
    "citation_issn": currentJournal?.settings?.find((setting) => setting.setting === "ISSN")?.value || '',
    "citation_language": language,
    "citation_article_type": article?.tag || '',
    "DC.language": language,
    "DC.title": article?.title || '',
    "DC.type": "journal",
    "DC.description": article?.abstract || '',
    "DC.date": article?.publicationDate || '',
    "DC.relation.ispartof": currentJournal?.name || '',
    "DC.publisher": "Episciences.org",
    "http://www.w3.org/ns/ldp#inbox": "https://inbox.episciences.org/",
    "DC.identifier": [
      article?.id?.toString() || '',
      article?.docLink || '',
      article?.pdfLink || ''
    ].filter(Boolean),
    "citation_author": authors.map(author => author.fullname),
    "citation_author_institution": authors.flatMap(author => author.institutions || []),
    "citation_author_orcid": authors.filter(author => author.orcid).map(author => author.orcid as string),
    "citation_keywords": keywords,
    "DC.creator": authors.map(author => author.fullname),
    "DC.subject": keywords
  };

  return {
    title: metadataTitle || '',
    description: article?.abstract || '',
    keywords: keywords,
    authors: authors.map(author => ({
      name: author.fullname,
      url: author.orcid
    })),
    openGraph: {
      title: metadataTitle || '',
      type: 'article',
      publishedTime: article?.publicationDate,
      modifiedTime: article?.modificationDate,
      authors: authors.map(author => author.fullname),
      tags: keywords,
      locale: language,
      url: article?.docLink || '',
      description: article?.abstract || '',
      siteName: "Episciences.org"
    },
    twitter: {
      card: 'summary_large_image',
      site: '@episciences',
      title: metadataTitle || '',
      description: article?.abstract || ''
    },
    other: otherMetadata
  }
}

export default function ArticleMeta({ 
  language, 
  article, 
  currentJournal, 
  keywords, 
  authors 
}: IArticleMetaProps): JSX.Element {
  const metadata = generateArticleMetadata({ language, article, currentJournal, keywords, authors });

  return (
    <>
      {Object.entries(metadata.other || {}).map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((v, i) => (
            <meta key={`${key}-${i}`} name={key} content={typeof v === 'string' ? v : v.toString()} />
          ));
        }
        return <meta key={key} name={key} content={typeof value === 'string' ? value : value.toString()} />;
      })}
      {metadata.openGraph && Object.entries(metadata.openGraph).map(([key, value]) => {
        if (Array.isArray(value)) {
          return value.map((v, i) => (
            <meta key={`og:${key}-${i}`} property={`og:${key}`} content={typeof v === 'string' ? v : v.toString()} />
          ));
        }
        if (typeof value === 'string') {
          return <meta key={`og:${key}`} property={`og:${key}`} content={value} />;
        }
        return null;
      })}
      {metadata.twitter && Object.entries(metadata.twitter).map(([key, value]) => {
        if (typeof value === 'string') {
          return <meta key={`twitter:${key}`} name={`twitter:${key}`} content={value} />;
        }
        return null;
      })}
    </>
  );
} 