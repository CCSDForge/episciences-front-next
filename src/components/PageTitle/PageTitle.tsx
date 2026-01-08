'use client';

import { useEffect } from 'react';
import { useAppSelector } from '@/hooks/store';

interface PageTitleProps {
  title: string;
}

export default function PageTitle({ title }: PageTitleProps) {
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);
  const defaultJournalTitle =
    process.env.NEXT_PUBLIC_JOURNAL_NAME || '[Pre-Production] Journal Epijinfo';

  useEffect(() => {
    document.title = `${title} | ${journalName ?? defaultJournalTitle}`;
  }, [title, journalName, defaultJournalTitle]);

  return null;
}
