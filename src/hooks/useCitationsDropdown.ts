'use client';

import { useState, useEffect, useRef } from 'react';
import { TFunction } from 'i18next';
import { useFetchArticleMetadataQuery } from '@/store/features/article/article.query';
import {
  CITATION_TEMPLATE,
  ICitation,
  METADATA_TYPE,
  copyToClipboardCitation,
  getCitations,
} from '@/utils/article';

export interface IUseCitationsDropdownReturn {
  citations: ICitation[];
  showCitationsDropdown: boolean;
  citationsDropdownRef: React.RefObject<HTMLDivElement | null>;
  copyCitation: (citation: ICitation) => void;
  handleTriggerMouseEnter: () => void;
  handleTriggerClick: () => void;
  handleContainerMouseLeave: () => void;
}

export function useCitationsDropdown(
  articleId: number,
  rvcode: string | undefined,
  t: TFunction<'translation', undefined>
): IUseCitationsDropdownReturn {
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [showCitationsDropdown, setShowCitationsDropdown] = useState(false);
  const [shouldLoadCitations, setShouldLoadCitations] = useState(false);

  const citationsDropdownRef = useRef<HTMLDivElement | null>(null);

  const { data: metadataCSL } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: articleId.toString(),
      type: METADATA_TYPE.CSL,
    },
    {
      skip: !articleId || !rvcode || !shouldLoadCitations,
    }
  );

  const { data: metadataBibTeX } = useFetchArticleMetadataQuery(
    {
      rvcode: rvcode!,
      paperid: articleId.toString(),
      type: METADATA_TYPE.BIBTEX,
    },
    {
      skip: !articleId || !rvcode || !shouldLoadCitations,
    }
  );

  // Close dropdown on touch outside
  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (
        citationsDropdownRef.current &&
        !citationsDropdownRef.current.contains(event.target as Node)
      ) {
        setShowCitationsDropdown(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, []);

  // Build citation list once both CSL and BibTeX data are available
  useEffect(() => {
    const fetchCitations = async () => {
      const fetchedCitations = await getCitations(metadataCSL as string);

      const bibtexIndex = fetchedCitations.findIndex(
        citation => citation.key === CITATION_TEMPLATE.BIBTEX
      );
      if (bibtexIndex !== -1 && metadataBibTeX) {
        fetchedCitations[bibtexIndex].citation = metadataBibTeX as string;
      }

      setCitations(fetchedCitations);
    };

    if (metadataCSL && metadataBibTeX) {
      fetchCitations();
    }
  }, [metadataCSL, metadataBibTeX]);

  const copyCitation = (citation: ICitation): void => {
    copyToClipboardCitation(citation, t);
    setShowCitationsDropdown(false);
  };

  const handleTriggerMouseEnter = (): void => {
    setShouldLoadCitations(true);
    setShowCitationsDropdown(true);
  };

  const handleTriggerClick = (): void => {
    setShouldLoadCitations(true);
    setShowCitationsDropdown(prev => !prev);
  };

  const handleContainerMouseLeave = (): void => {
    setShowCitationsDropdown(false);
  };

  return {
    citations,
    showCitationsDropdown,
    citationsDropdownRef,
    copyCitation,
    handleTriggerMouseEnter,
    handleTriggerClick,
    handleContainerMouseLeave,
  };
}
