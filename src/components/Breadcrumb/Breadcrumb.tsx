'use client';

import { Link } from '@/components/Link/Link';
import MathJax from '@/components/MathJax/MathJax';
import { getLocalizedPath } from '@/utils/language-utils';
import { getJournalBaseUrl } from '@/utils/signposting';
import { useParams } from 'next/navigation';
import './Breadcrumb.scss';

interface IBreadcrumbProps {
  parents: {
    path: string;
    label: string;
  }[];
  crumbLabel: string;
  lang?: string;
}

export default function Breadcrumb({
  parents,
  crumbLabel,
  lang,
}: IBreadcrumbProps): React.JSX.Element {
  const params = useParams();
  const journalId = (params?.journalId as string) || '';

  // JSON-LD Structured Data
  const generateJsonLd = () => {
    if (!journalId) return null;

    const baseUrl = getJournalBaseUrl(journalId);
    const currentLang = lang || 'en';

    const items = [
      ...parents.map((parent, index) => {
        const cleanLabel = parent.label.replace(/\s*>\s*$/, '').trim();
        let itemUrl = '';

        if (parent.path === '#') {
          // If no path, we don't include it in JSON-LD or we use the current page (less ideal)
          return null;
        } else if (parent.path.startsWith('http')) {
          itemUrl = parent.path;
        } else {
          itemUrl = `${baseUrl}${getLocalizedPath(parent.path, currentLang)}`;
        }

        return {
          '@type': 'ListItem',
          position: index + 1,
          name: cleanLabel,
          item: itemUrl,
        };
      }),
      {
        '@type': 'ListItem',
        position: parents.length + 1,
        name: crumbLabel,
        // The last item usually doesn't need a URL or can point to the current page,
        // but for breadcrumbs, it's better to provide it if possible.
        // However, we don't have the current full path here easily.
      },
    ].filter(Boolean);

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: items,
    };

    return (
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    );
  };

  return (
    <>
      {generateJsonLd()}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          {parents.map((parent, index) => (
            <li key={index} className="breadcrumb-parent">
              {parent.path === '#' ? (
                <span>{parent.label}</span>
              ) : (
                <Link href={`${parent.path}`} lang={lang}>
                  {parent.label}
                </Link>
              )}
            </li>
          ))}
          <li className="breadcrumb-current" aria-current="page">
            <MathJax dynamic>{crumbLabel}</MathJax>
          </li>
        </ol>
      </nav>
    </>
  );
}
