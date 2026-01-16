'use client';

import { Link } from '@/components/Link/Link';
import MathJax from '@/components/MathJax/MathJax';
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
  return (
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
  );
}
