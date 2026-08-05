'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { QuoteBlackIcon } from '@/components/icons';
import { useAppSelector } from '@/hooks/store';
import { logger } from '@/lib/logger';
import { fetchArticleMetadata } from '@/services/article';
import { METADATA_TYPE, getMetadataTypes } from '@/utils/article';
import { toastError, toastSuccess } from '@/utils/toast';

import { SidebarDropdown, useSidebarDropdown } from './SidebarDropdown/SidebarDropdown';

interface MetadataDropdownProps {
  readonly articleId?: string;
  /** Pre-translated label from the server; falls back to the client i18n instance. */
  readonly label?: string;
}

const getFileExtension = (type: METADATA_TYPE): string => {
  switch (type) {
    case METADATA_TYPE.BIBTEX:
      return 'bib';
    case METADATA_TYPE.JSON:
    case METADATA_TYPE.CSL:
    case METADATA_TYPE.JSON_LD:
      return 'json';
    case METADATA_TYPE.RIS:
      return 'ris';
    default:
      return 'xml';
  }
};

/** Lives inside the provider so a successful download can close the menu. */
function MetadataMenuItems({ articleId }: { readonly articleId?: string }): React.JSX.Element {
  const { t } = useTranslation();
  const rvcode = useAppSelector(state => state.journalReducer.currentJournal?.code);
  const {
    actions: { close },
  } = useSidebarDropdown();

  const [isDownloading, setIsDownloading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const downloadMetadata = useCallback(
    async (metadata: { type: METADATA_TYPE; label: string }): Promise<void> => {
      if (!articleId || !rvcode || isDownloading) return;

      // Cancel any previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setIsDownloading(true);
        const metadataContent = await fetchArticleMetadata({
          rvcode,
          paperid: articleId,
          type: metadata.type,
        });

        if (controller.signal.aborted) return;

        if (!metadataContent) {
          toastError(t('pages.articleDetails.metadata.downloadError'));
          return;
        }

        // Create blob and trigger download
        const blob = new Blob([metadataContent], { type: 'text/plain' });
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `article_${articleId}_metadata_${metadata.type}.${getFileExtension(metadata.type)}`;

        document.body.appendChild(a);
        a.click();

        window.URL.revokeObjectURL(url);
        a.remove();

        toastSuccess(
          t('pages.articleDetails.metadata.downloadSuccess', { format: metadata.label })
        );
        close();
      } catch (error) {
        if (controller.signal.aborted) return;
        logger.error('Error downloading metadata:', error);
        toastError(t('pages.articleDetails.metadata.downloadError'));
      } finally {
        if (!controller.signal.aborted) {
          setIsDownloading(false);
        }
      }
    },
    [articleId, rvcode, isDownloading, t, close]
  );

  return (
    <>
      {getMetadataTypes().map(metadata => (
        <SidebarDropdown.Item
          key={metadata.type}
          onSelect={(): void => {
            void downloadMetadata(metadata);
          }}
        >
          {metadata.label}
        </SidebarDropdown.Item>
      ))}
    </>
  );
}

export default function MetadataDropdown({
  articleId,
  label,
}: MetadataDropdownProps): React.JSX.Element | null {
  const { t } = useTranslation();

  // Nothing to download when no format is configured
  if (getMetadataTypes().length === 0) return null;

  return (
    <SidebarDropdown.Provider>
      <SidebarDropdown.Frame>
        <SidebarDropdown.Trigger
          icon={
            <QuoteBlackIcon
              size={14}
              className="articleDetailsSidebar-links-link-icon"
              ariaLabel="metadata icon"
            />
          }
          label={label || t('pages.articleDetails.actions.metadata')}
        />
        <SidebarDropdown.Menu>
          <MetadataMenuItems articleId={articleId} />
        </SidebarDropdown.Menu>
      </SidebarDropdown.Frame>
    </SidebarDropdown.Provider>
  );
}
