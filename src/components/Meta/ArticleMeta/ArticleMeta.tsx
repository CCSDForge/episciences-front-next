import { Metadata } from 'next';
import { IArticle, IArticleAuthor, IArticleAbstracts } from '@/types/article';
import { IJournal } from '@/types/journal';
import { AvailableLanguage } from '@/utils/i18n';

interface IArticleMetaProps {
  language: AvailableLanguage;
  article?: IArticle;
  currentJournal?: IJournal;
  keywords: string[];
  authors: IArticleAuthor[];
}

// Helper function to extract abstract as string
function getAbstractString(
  abstract: string | IArticleAbstracts | undefined,
  language: AvailableLanguage
): string {
  if (!abstract) return '';
  if (typeof abstract === 'string') return abstract;
  // If it's an object with language keys, try to get the abstract for the current language
  const langAbstract = abstract[language];
  if (langAbstract) return langAbstract;
  // Fallback to first available language
  const firstAbstract = Object.values(abstract)[0];
  return firstAbstract || '';
}

export function generateArticleMetadata({
  language,
  article,
  currentJournal,
  keywords,
  authors,
}: IArticleMetaProps): Metadata {
  const metadataTitle = article?.title
    ? `${article.title}${currentJournal?.name ? ` | ${currentJournal.name}` : ''}`
    : undefined;
  const abstractString: string = getAbstractString(article?.abstract, language);

  const otherMetadata: Record<string, string | string[]> = {
    citation_journal_title: currentJournal?.name || '',
    citation_title: article?.title || '',
    citation_publication_date: article?.publicationDate || '',
    citation_doi: article?.doi || '',
    citation_fulltext_world_readable: '',
    citation_pdf_url: article?.pdfLink || '',
    citation_issn:
      currentJournal?.settings?.find(setting => setting.setting === 'ISSN')?.value || '',
    citation_language: language,
    citation_article_type: article?.tag || '',
    'DC.language': language,
    'DC.title': article?.title || '',
    'DC.type': 'journal',
    'DC.description': abstractString,
    'DC.date': article?.publicationDate || '',
    'DC.relation.ispartof': currentJournal?.name || '',
    'DC.publisher': 'Episciences.org',
    'http://www.w3.org/ns/ldp#inbox': 'https://inbox.episciences.org/',
    'DC.identifier': [
      article?.id?.toString() || '',
      article?.docLink || '',
      article?.pdfLink || '',
    ].filter(Boolean),
    citation_author: authors.map(author => author.fullname),
    citation_author_institution: authors.flatMap(
      author => author.institutions?.map(inst => inst.name) || []
    ),
    citation_author_orcid: authors
      .filter(author => author.orcid)
      .map(author => author.orcid as string),
    citation_keywords: keywords,
    'DC.creator': authors.map(author => author.fullname),
    'DC.subject': keywords,
  };

  return {
    title: metadataTitle || '',
    description: abstractString,
    keywords: keywords,
    authors: authors.map(author => ({
      name: author.fullname,
      url: author.orcid,
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
      description: abstractString,
      siteName: 'Episciences.org',
    },
    twitter: {
      card: 'summary_large_image',
      site: '@episciences',
      title: metadataTitle || '',
      description: abstractString,
    },
    other: otherMetadata,
  };
}
