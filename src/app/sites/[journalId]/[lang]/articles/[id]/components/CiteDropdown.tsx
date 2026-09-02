'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QuoteBlackIcon } from '@/components/icons';
import { logger } from '@/lib/logger';
import { toastError } from '@/utils/toast';
import {
  CITATION_TEMPLATE,
  copyToClipboardCitation,
  getCitations,
  type ICitation,
} from '@/utils/article';

import { SidebarDropdown, useSidebarDropdown } from './SidebarDropdown/SidebarDropdown';

interface CiteDropdownProps {
  readonly metadataCSL?: string | null;
  readonly metadataBibTeX?: string | null;
  /** Pre-translated label from the server; falls back to the client i18n instance. */
  readonly label?: string;
}

/** Citations are fetched the first time the menu opens, not on mount. */
function useLazyCitations(metadataCSL?: string | null, metadataBibTeX?: string | null) {
  const { t } = useTranslation();
  const [citations, setCitations] = useState<ICitation[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const load = useCallback(async (): Promise<void> => {
    if (hasLoaded || (!metadataCSL && !metadataBibTeX)) return;

    // Cancel any previous in-flight request
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      setIsLoading(true);
      const fetchedCitations = await getCitations(metadataCSL as string);

      if (controller.signal.aborted) return;

      // Update the BibTeX citation with the proper content
      const bibtexIndex = fetchedCitations.findIndex(
        citation => citation.key === CITATION_TEMPLATE.BIBTEX
      );
      if (bibtexIndex !== -1 && metadataBibTeX) {
        fetchedCitations[bibtexIndex].citation = metadataBibTeX;
      }

      // Filter out citations with empty content
      setCitations(
        fetchedCitations.filter(citation => citation.citation && citation.citation.trim() !== '')
      );
      setHasLoaded(true);
    } catch (error) {
      if (controller.signal.aborted) return;
      logger.error('[CiteDropdown] Error generating citations:', error);
      toastError(t('pages.articleDetails.actions.citationError'));
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [hasLoaded, metadataCSL, metadataBibTeX, t]);

  return { citations, isLoading, load };
}

/** Lives inside the provider so it can close the menu after copying. */
function CiteMenuItems({
  citations,
  isLoading,
}: {
  readonly citations: ICitation[];
  readonly isLoading: boolean;
}): React.JSX.Element {
  const { t } = useTranslation();
  const {
    actions: { close },
  } = useSidebarDropdown();

  if (isLoading) {
    return <SidebarDropdown.Status>{t('common.loading')}...</SidebarDropdown.Status>;
  }

  return (
    <>
      {citations.map(citation => (
        <SidebarDropdown.Item
          key={citation.key}
          onSelect={(): void => {
            copyToClipboardCitation(citation, t);
            close();
          }}
        >
          {citation.key}
        </SidebarDropdown.Item>
      ))}
    </>
  );
}

export default function CiteDropdown({
  metadataCSL,
  metadataBibTeX,
  label,
}: CiteDropdownProps): React.JSX.Element | null {
  const { t } = useTranslation();
  const { citations, isLoading, load } = useLazyCitations(metadataCSL, metadataBibTeX);

  const loadCitations = useCallback((): void => {
    void load();
  }, [load]);

  // Nothing to cite without metadata
  if (!metadataCSL && !metadataBibTeX) return null;

  return (
    <SidebarDropdown.Provider onOpen={loadCitations}>
      <SidebarDropdown.Frame>
        <SidebarDropdown.Trigger
          icon={
            <QuoteBlackIcon
              size={14}
              className="articleDetailsSidebar-links-link-icon"
              ariaLabel="cite icon"
            />
          }
          label={label || t('pages.articleDetails.actions.cite')}
        />
        <SidebarDropdown.Menu>
          <CiteMenuItems citations={citations} isLoading={isLoading} />
        </SidebarDropdown.Menu>
      </SidebarDropdown.Frame>
    </SidebarDropdown.Provider>
  );
}
