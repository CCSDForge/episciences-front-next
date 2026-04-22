'use client';

import { Link } from '@/components/Link/Link';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';

import { AvailableLanguage } from '@/utils/i18n';
import './JournalSection.scss';

interface IJournalSectionProps {
  language: AvailableLanguage;
  content?: Record<AvailableLanguage, string>;
}

export default function JournalSection({
  content,
  language,
}: IJournalSectionProps): React.JSX.Element {
  return (
    <div className="journalSection">
      {content && (
        <MarkdownRenderer
          components={{
            a: ({ ...props }) => (
              <Link href={props.href!} target="_blank" rel="noopener noreferrer">
                {props.children}
              </Link>
            ),
          }}
        >
          {content[language]}
        </MarkdownRenderer>
      )}
    </div>
  );
}
