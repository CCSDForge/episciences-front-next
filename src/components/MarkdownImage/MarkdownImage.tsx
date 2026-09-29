'use client';

import Image from 'next/image';
import type { ComponentProps } from 'react';
import type { ExtraProps } from 'react-markdown';
import { useAppSelector } from '@/hooks/store';
import { getMarkdownImageURL } from '@/utils/markdown';

const RESOURCES_PATH = /^\/([a-z0-9-]{2,50})\/resources\//;

/**
 * `img` renderer for markdown content, served through the next/image optimizer.
 */
export default function MarkdownImage({
  src,
  alt,
}: Readonly<ComponentProps<'img'> & ExtraProps>): React.JSX.Element {
  const storeRvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const rawSrc = typeof src === 'string' ? src : '';

  // Only rewrite journal-relative paths - an already-absolute URL
  // (e.g. an external logo) must not be prefixed with the journal host.
  // Root-relative paths (e.g. /arima/resources/x.jpg) are served by nginx,
  // not by Next: the image optimizer would fetch them from itself and fail
  // with "isn't a valid image", so they need an absolute journal URL.
  // For /<journal>/resources/ paths the journal code is in the path itself
  // (nginx enforces that it matches the host), which needs no env or store.
  // Otherwise fall back to the build-time env var, then the store (which can
  // still be empty on first render).
  const journalCode =
    RESOURCES_PATH.exec(rawSrc)?.[1] || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || storeRvcode || '';
  const isJournalRelative =
    rawSrc.includes('/public/') ||
    (journalCode !== '' && rawSrc.startsWith('/') && !rawSrc.startsWith('//'));
  const resolvedSrc = isJournalRelative ? getMarkdownImageURL(rawSrc, journalCode) : rawSrc;

  return (
    <Image
      src={resolvedSrc}
      alt={alt || ''}
      width={0}
      height={0}
      sizes="100vw"
      style={{ width: 'auto', height: 'auto', maxWidth: '100%' }}
    />
  );
}
