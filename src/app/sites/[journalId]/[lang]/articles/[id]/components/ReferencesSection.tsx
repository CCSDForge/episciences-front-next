import { Link } from '@/components/Link/Link';
import { IArticleReference } from '@/types/article';

interface ReferencesSectionProps {
  references: IArticleReference[];
}

export default function ReferencesSection({ references }: ReferencesSectionProps): React.JSX.Element | null {
  if (!references?.length) return null;

  const doiHomepage = process.env.NEXT_PUBLIC_VITE_DOI_HOMEPAGE || 'https://doi.org';

  return (
    <ol className="articleDetails-content-article-section-content-references">
      {references.map((reference, index) => (
        <li key={index} className="articleDetails-content-article-section-content-references-reference">
          <p>{reference.citation}</p>
          {reference.doi && (
            <Link
              href={`${doiHomepage}/${reference.doi}`}
              className="articleDetails-content-article-section-content-references-reference-doi"
              target="_blank"
              rel="noopener noreferrer"
            >
              DOI : {reference.doi}
            </Link>
          )}
        </li>
      ))}
    </ol>
  );
} 