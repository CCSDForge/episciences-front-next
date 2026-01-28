import { IClassificationItem } from '@/types/article';

interface ClassificationsSectionProps {
  classifications: IClassificationItem[];
}

export default function ClassificationsSection({
  classifications,
}: ClassificationsSectionProps): React.JSX.Element {
  return (
    <ul className="classifications-list">
      {classifications.map(item => (
        <li
          key={item.code}
          className="articleDetails-content-article-section-content-classifications-item"
        >
          <a
            href={`https://zbmath.org/classification/?q=${encodeURIComponent(item.code)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {item.code}
          </a>
          {item.label && ` - ${item.label}`}
        </li>
      ))}
    </ul>
  );
}
