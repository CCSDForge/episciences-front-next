'use client';

import { Link } from '@/components/Link/Link';
import ReactMarkdown from 'react-markdown';

import { AvailableLanguage } from '@/utils/i18n';
import './JournalSection.scss';

interface IJournalSectionProps {
  language: AvailableLanguage;
  content?: Record<AvailableLanguage, string>;
}

export default function JournalSection({ content, language }: IJournalSectionProps): JSX.Element {
  return (
    <div className="journalSection">
        {content && (
          <ReactMarkdown
            components={{
              a: ({ ...props }) => (
                <Link href={props.href!} target='_blank'>
                  <span>{props.children?.toString()}</span>
                  <img src="/icons/external-link-red.svg" alt='Journal link icon' />
                </Link>
              ),
            }}
          >
            {content[language]}</ReactMarkdown>
        )}
    </div>
  )
} 