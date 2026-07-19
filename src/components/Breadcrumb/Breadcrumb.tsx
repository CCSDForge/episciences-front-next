'use client';

import { Link } from '@/components/Link/Link';
import JsonLd from '@/components/Meta/JsonLd';
import MathJax from '@/components/MathJax/MathJax';
import { generateBreadcrumbJsonLd } from '@/utils/schema';
import { useParams, usePathname } from 'next/navigation';
import './Breadcrumb.scss';

interface IBreadcrumbProps {
  readonly parents: {
    path: string;
    label: string;
  }[];
  readonly crumbLabel: string;
  readonly lang?: string;
}

export default function Breadcrumb({
  parents,
  crumbLabel,
  lang,
}: IBreadcrumbProps): React.JSX.Element {
  const params = useParams();
  const journalId = (params?.journalId as string) || '';
  const pathname = usePathname();
  const currentLang = lang || 'en';

  const jsonLd = journalId
    ? generateBreadcrumbJsonLd(parents, crumbLabel, currentLang, journalId, pathname)
    : null;

  return (
    <>
      {jsonLd && <JsonLd data={jsonLd} />}
      <nav className="breadcrumb" aria-label="Breadcrumb">
        <ol>
          {parents.map(parent => (
            <li key={`${parent.path}-${parent.label}`} className="breadcrumb-parent">
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
