import { NAKALA_API_URL, NAKALA_URL } from '@/config/external-urls';
import { logger } from '@/lib/logger';
import { safeFetchData } from '@/utils/api-error-handler';
import {
  RepositoryPreview,
  RepositoryPreviewFile,
  RepositoryProvider,
} from '@/types/repository-preview';

const log = logger.child({ service: 'nakala' });

const NAKALA_DOI_PREFIX = '10.34847';
// Post-normalization: lowercase DOI, prefix required, bounded length.
const IDENTIFIER_RE = /^10\.34847\/[a-z0-9._-]{1,100}$/;
const SHA1_RE = /^[a-f0-9]{40}$/i;
const FETCH_TIMEOUT_MS = 5000;

// Formats actually served as tiles by Nakala's Cantaloupe/IIIF backend.
// Deliberately excludes svg/gif, which the API accepts as uploads but cannot tile.
const IIIF_IMAGE_MIME = new Set([
  'image/jpeg',
  'image/png',
  'image/tiff',
  'image/jp2',
  'image/webp',
]);
const IIIF_IMAGE_EXT = new Set(['jpg', 'jpeg', 'png', 'tif', 'tiff', 'jp2', 'webp']);

interface NakalaFile {
  name?: string;
  extension?: string;
  mime_type?: string;
  sha1?: string;
  embargoed?: string | null;
}

interface NakalaDataResponse {
  status?: string;
  fileEmbargoed?: boolean;
  files?: NakalaFile[];
}

/**
 * Only a value that already carries the Nakala DOI prefix is normalized. Auto-prefixing an
 * arbitrary bare string (e.g. an unrelated HAL id) would misclassify it as a Nakala identifier.
 */
function normalizeCandidate(candidate: string): string | null {
  const normalized = candidate.trim().toLowerCase();
  if (!normalized.startsWith(`${NAKALA_DOI_PREFIX}/`)) return null;
  return IDENTIFIER_RE.test(normalized) ? normalized : null;
}

/**
 * Matches a DOI-prefixed value (`10.34847/...`), a nakala.fr URL, or a doi.org URL resolving to
 * a Nakala DOI. Hostnames are compared exactly (via URL parsing), not by substring, so
 * `evil-nakala.fr` or `nakala.fr.attacker.com` are correctly rejected.
 */
function match(value: string): string | null {
  const raw = value?.trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      return null;
    }
    const host = url.hostname.toLowerCase();
    const isNakalaHost = host === 'nakala.fr' || host.endsWith('.nakala.fr');
    const isDoiHost = host === 'doi.org' || host === 'dx.doi.org';
    if (!isNakalaHost && !isDoiHost) return null;

    let path: string;
    try {
      path = decodeURIComponent(url.pathname);
    } catch {
      return null;
    }
    return normalizeCandidate(path.replace(/^\/+/, ''));
  }

  return normalizeCandidate(raw);
}

function landingUrl(identifier: string): string {
  return `${NAKALA_URL}/${identifier}`;
}

function isEmbargoed(file: NakalaFile): boolean {
  if (!file.embargoed) return false;
  const embargoDate = new Date(file.embargoed);
  // Fail closed: an unparseable embargo value must not expose a flagged file.
  if (Number.isNaN(embargoDate.getTime())) return true;
  return embargoDate.getTime() > Date.now();
}

function isPreviewableImage(file: NakalaFile): boolean {
  const mimeType = file.mime_type?.toLowerCase();
  if (mimeType && IIIF_IMAGE_MIME.has(mimeType)) return true;
  const extension = file.extension?.toLowerCase();
  return !!extension && IIIF_IMAGE_EXT.has(extension);
}

function buildEmbedUrl(identifier: string, sha1: string): string | null {
  if (!IDENTIFIER_RE.test(identifier) || !SHA1_RE.test(sha1)) return null;
  const encodedIdentifier = identifier.split('/').map(encodeURIComponent).join('/');
  return `${NAKALA_API_URL}/embed/${encodedIdentifier}/${encodeURIComponent(sha1)}?buttons=true`;
}

function emptyPreview(identifier: string): RepositoryPreview {
  return { providerId: 'nakala', identifier, landingUrl: landingUrl(identifier), files: [] };
}

function toPreview(identifier: string, data: NakalaDataResponse): RepositoryPreview {
  if (data.status !== 'published' || data.fileEmbargoed) {
    return emptyPreview(identifier);
  }

  const files = Array.isArray(data.files) ? data.files : [];
  const previewFiles: RepositoryPreviewFile[] = [];

  for (const file of files) {
    if (!file.sha1 || isEmbargoed(file) || !isPreviewableImage(file)) {
      if (file.sha1 && !isPreviewableImage(file)) {
        log.warn('Unsupported Nakala file skipped', { identifier, name: file.name });
      }
      continue;
    }
    const embedUrl = buildEmbedUrl(identifier, file.sha1);
    if (!embedUrl) continue;

    previewFiles.push({
      id: file.sha1,
      label: file.name || file.sha1,
      embedUrl,
      kind: 'image',
    });
  }

  return {
    providerId: 'nakala',
    identifier,
    landingUrl: landingUrl(identifier),
    files: previewFiles,
  };
}

async function resolve(identifier: string): Promise<RepositoryPreview> {
  return safeFetchData(
    async () => {
      const response = await fetch(`${NAKALA_API_URL}/datas/${identifier}`, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        next: { revalidate: 86400, tags: [`nakala-${identifier}`] },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }
      const data: NakalaDataResponse = await response.json();
      return toPreview(identifier, data);
    },
    emptyPreview(identifier),
    `nakala.resolve(${identifier})`
  );
}

export const nakalaProvider: RepositoryProvider = {
  id: 'nakala',
  frameSrc: [NAKALA_API_URL],
  match,
  landingUrl,
  resolve,
};
