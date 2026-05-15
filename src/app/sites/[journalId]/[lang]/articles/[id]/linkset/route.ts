import { NextRequest, NextResponse } from 'next/server';
import { fetchArticle } from '@/services/article';
import { getJournalBaseUrl, SIGNPOSTING_FORMATS } from '@/utils/signposting';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ journalId: string; lang: string; id: string }> }
) {
  const { journalId, lang, id } = await context.params;

  if (!/^\d+$/.test(id)) {
    return new NextResponse('Invalid article id', { status: 400 });
  }

  const article = await fetchArticle(id, journalId);
  if (!article) {
    return new NextResponse('Not found', { status: 404 });
  }

  const baseUrl = getJournalBaseUrl(journalId);
  const articleUrl = `${baseUrl}/${lang}/articles/${id}`;

  const entry: Record<string, unknown> = { anchor: articleUrl };

  if (article.doi) {
    entry['cite-as'] = [{ href: `https://doi.org/${article.doi}` }];
  }

  entry['type'] = [{ href: 'https://schema.org/ScholarlyArticle' }];

  const orcidAuthors = article.authors.filter(a => a.orcid);
  if (orcidAuthors.length > 0) {
    entry['author'] = orcidAuthors.map(a => ({ href: `https://orcid.org/${a.orcid}` }));
  }

  if (article.pdfLink) {
    entry['item'] = [{ href: article.pdfLink, type: 'application/pdf' }];
  }

  if (article.license) {
    entry['license'] = [{ href: article.license }];
  }

  entry['describedby'] = SIGNPOSTING_FORMATS.map(({ format, type }) => ({
    href: `${articleUrl}/${format}`,
    type,
  }));

  entry['linkset'] = [{ href: `${articleUrl}/linkset`, type: 'application/linkset+json' }];

  return new NextResponse(JSON.stringify({ linkset: [entry] }), {
    status: 200,
    headers: {
      'Content-Type': 'application/linkset+json',
      'Cache-Control': 'public, max-age=604800',
    },
  });
}
