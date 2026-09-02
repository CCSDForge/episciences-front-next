'use client';

import { useIframeLoadState } from '@/hooks/useIframeLoadState';
import './ExternalEmbedViewer.scss';

// Generous enough for a slow IIIF tile server without leaving the user staring too long.
const LOAD_TIMEOUT_MS = 15000;

interface ExternalEmbedViewerProps {
  readonly src: string;
  readonly title: string;
  readonly loadingLabel: string;
  readonly errorLabel: string;
  readonly retryLabel: string;
  readonly className?: string;
}

/**
 * Generic hardened iframe for embedding a third-party repository's own viewer (Nakala's IIIF
 * embed today; a future provider's embed tomorrow). Deliberately sandboxed: no allow-forms,
 * allow-modals, or allow-top-navigation, and no referrer sent to the third party.
 */
export function ExternalEmbedViewer({
  src,
  title,
  loadingLabel,
  errorLabel,
  retryLabel,
  className = '',
}: ExternalEmbedViewerProps): React.JSX.Element {
  const { status, isMounted, retryKey, handleLoad, handleError, retry } = useIframeLoadState(
    src,
    LOAD_TIMEOUT_MS
  );

  return (
    <div className={`external-embed-viewer ${className}`}>
      <div className="external-embed-viewer-status" aria-live="polite">
        {status === 'loading' && (
          <div className="external-embed-viewer-loading">{loadingLabel}</div>
        )}
        {status === 'error' && (
          <div className="external-embed-viewer-error">
            <span>{errorLabel}</span>
            <button type="button" className="external-embed-viewer-retry" onClick={retry}>
              {retryLabel}
            </button>
          </div>
        )}
      </div>
      {isMounted && status !== 'error' && (
        <iframe
          key={`${src}-${retryKey}`}
          src={src}
          title={title}
          className="external-embed-viewer-iframe"
          loading="lazy"
          referrerPolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"
          allow="fullscreen"
          aria-busy={status === 'loading'}
          onLoad={handleLoad}
          onError={handleError}
        />
      )}
    </div>
  );
}

export default ExternalEmbedViewer;
