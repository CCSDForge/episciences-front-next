import { IArticle } from '@/types/article';
import { getJournalBaseUrl, SIGNPOSTING_FORMATS } from '@/utils/signposting';

interface SignpostingLinksProps {
  article: IArticle;
  rvcode: string;
  id: string;
  lang: string;
}

export default function SignpostingLinks({ article, rvcode, id, lang }: SignpostingLinksProps) {
  const baseUrl = getJournalBaseUrl(rvcode);
  const articleUrl = `${baseUrl}/${lang}/articles/${id}`;

  return (
    <>
      {article.doi && <link rel="cite-as" href={`https://doi.org/${article.doi}`} />}
      <link rel="type" href="https://schema.org/ScholarlyArticle" />
      {article.authors
        .filter(a => a.orcid)
        .map(a => (
          <link key={a.orcid} rel="author" href={`https://orcid.org/${a.orcid}`} />
        ))}
      {article.pdfLink && <link rel="item" href={article.pdfLink} type="application/pdf" />}
      {article.license && <link rel="license" href={article.license} />}
      {SIGNPOSTING_FORMATS.map(({ format, type, profile }) => (
        <link
          key={format}
          rel="describedby"
          href={`${articleUrl}/${format}`}
          type={type}
          {...(profile ? { profile } : {})}
        />
      ))}
      <link rel="linkset" href={`${articleUrl}/linkset`} type="application/linkset+json" />
    </>
  );
}
