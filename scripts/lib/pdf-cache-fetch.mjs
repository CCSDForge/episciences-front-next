/**
 * PDF disk cache — upstream fetch & validation (worker-side).
 *
 * Everything here re-validates independently of the pub/sub message that
 * triggered it: a Valkey message is not authenticated, so this is the real
 * security boundary for what the worker will ever write to the shared NFS
 * cache, not the route that published the message.
 */

import { Readable, Transform } from 'node:stream';
import { isAllowedPdfDomain } from './allowed-pdf-domains.mjs';

const PDF_MAGIC = Buffer.from('%PDF-');

export class PdfValidationError extends Error {
  constructor(message, code) {
    super(message);
    this.name = 'PdfValidationError';
    this.code = code;
  }
}

// arxiv/zenodo may return an HTML error page with HTTP 200 (rate-limit,
// captcha, redirect) — same caveat documented in the route's isPdfContentType.
function isPdfContentType(contentType) {
  return contentType.includes('pdf') || contentType.includes('octet-stream');
}

/**
 * Re-fetches a URL for the cache, independently re-validating the domain
 * (before AND after following redirects), the content-type, and — via the
 * transform returned by createValidatingStream() — the PDF magic bytes and
 * declared size.
 */
export async function fetchUpstream(url, options = {}) {
  const { timeoutMs = 20000, conditionalHeaders = {} } = options;

  if (!isAllowedPdfDomain(url)) {
    throw new PdfValidationError(`Domain not allowed: ${url}`, 'DOMAIN_NOT_ALLOWED');
  }

  const response = await fetch(url, {
    signal: AbortSignal.timeout(timeoutMs),
    headers: {
      'User-Agent': 'Episciences-PDF-Cache-Worker/1.0',
      ...conditionalHeaders,
    },
  });

  if (response.status === 304) {
    return { notModified: true };
  }

  if (!response.ok) {
    throw new PdfValidationError(`Upstream returned HTTP ${response.status}`, 'BAD_STATUS');
  }

  // fetch() follows redirects by default — a whitelisted domain that
  // redirects elsewhere (compromise, misconfiguration, a mirror) must not be
  // allowed to make the worker fetch (and cache) an arbitrary host.
  const finalUrl = response.url || url;
  if (!isAllowedPdfDomain(finalUrl)) {
    throw new PdfValidationError(`Redirect to non-whitelisted host: ${finalUrl}`, 'REDIRECT_NOT_ALLOWED');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!isPdfContentType(contentType)) {
    throw new PdfValidationError(`Unexpected upstream content-type: ${contentType}`, 'BAD_CONTENT_TYPE');
  }

  const contentLengthHeader = response.headers.get('content-length');

  return {
    notModified: false,
    body: response.body,
    finalUrl,
    contentType,
    httpStatus: response.status,
    etag: response.headers.get('etag') ?? undefined,
    lastModified: response.headers.get('last-modified') ?? undefined,
    expectedBytes: contentLengthHeader ? Number(contentLengthHeader) : undefined,
  };
}

export function buildConditionalHeaders(existingSidecar) {
  const headers = {};
  if (existingSidecar?.etag) headers['If-None-Match'] = existingSidecar.etag;
  if (existingSidecar?.lastModified) headers['If-Modified-Since'] = existingSidecar.lastModified;
  return headers;
}

/**
 * Validates the response body as it streams through, without buffering it:
 * - the first bytes must be the PDF magic number (`%PDF-`) — the route's
 *   Content-Type check can be spoofed by an upstream error page served with
 *   a misleading header; this can't, and it prevents poisoning the cache
 *   with a captcha page for up to PDF_CACHE_RETENTION_DAYS.
 * - the total size never exceeds `maxBytes`.
 * - if the upstream declared a Content-Length, the final size must match it
 *   exactly — a connection cut mid-download must not produce a truncated
 *   file that gets renamed into place and served as valid.
 *
 * Any violation destroys the stream with a PdfValidationError, which
 * propagates through stream/promises pipeline() and aborts the write before
 * the temp file is ever renamed into its final path.
 */
export function createValidatingStream(webStream, { maxBytes, expectedBytes } = {}) {
  const nodeReadable = Readable.fromWeb(webStream);

  const guard = new Transform({
    construct(callback) {
      this._total = 0;
      this._checkedMagic = false;
      this._magicBuffer = Buffer.alloc(0);
      callback();
    },
    transform(chunk, _enc, callback) {
      this._total += chunk.length;

      if (maxBytes && this._total > maxBytes) {
        callback(new PdfValidationError(`Upstream body exceeds PDF_CACHE_MAX_BYTES (${maxBytes})`, 'TOO_LARGE'));
        return;
      }

      if (!this._checkedMagic) {
        if (this._magicBuffer.length < PDF_MAGIC.length) {
          this._magicBuffer = Buffer.concat([this._magicBuffer, chunk]).subarray(0, PDF_MAGIC.length);
        }
        if (this._magicBuffer.length >= PDF_MAGIC.length) {
          this._checkedMagic = true;
          if (!this._magicBuffer.equals(PDF_MAGIC)) {
            callback(
              new PdfValidationError(
                'Upstream body does not start with the PDF magic bytes (likely an HTML error/captcha page)',
                'BAD_MAGIC'
              )
            );
            return;
          }
        }
      }

      callback(null, chunk);
    },
    flush(callback) {
      if (!this._checkedMagic) {
        callback(new PdfValidationError('Upstream body too short to be a PDF', 'BAD_MAGIC'));
        return;
      }
      if (expectedBytes != null && this._total !== expectedBytes) {
        callback(
          new PdfValidationError(
            `Upstream body truncated: expected ${expectedBytes} bytes, got ${this._total}`,
            'TRUNCATED'
          )
        );
        return;
      }
      callback();
    },
  });

  nodeReadable.on('error', err => guard.destroy(err));
  return nodeReadable.pipe(guard);
}
