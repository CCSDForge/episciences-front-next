'use client';

import { Link } from '@/components/Link/Link';
import MarkdownRenderer from '@/components/MarkdownRenderer/MarkdownRenderer';

import { AvailableLanguage } from '@/utils/i18n';
import './JournalSection.scss';

interface IJournalSectionProps {
  language: AvailableLanguage;
  content?: Record<AvailableLanguage, string>;
}

function JournalSectionLink({ ...props }: React.ComponentProps<'a'>): React.JSX.Element {
  return (
    <Link href={props.href!} target="_blank" rel="noopener noreferrer">
      {props.children}
    </Link>
  );
}

const journalSectionMarkdownComponents = { a: JournalSectionLink };

export default function JournalSection({
  content,
  language,
}: Readonly<IJournalSectionProps>): React.JSX.Element {
  return (
    <div className="journalSection">
      {content && (
        <MarkdownRenderer components={journalSectionMarkdownComponents}>
          {content[language]}
        </MarkdownRenderer>
      )}
    </div>
  );
}
