import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Readable } from 'node:stream';
import {
  fetchUpstream,
  buildConditionalHeaders,
  createValidatingStream,
  PdfValidationError,
} from '../pdf-cache-fetch.mjs';

function pdfResponse(body, init = {}) {
  const { headers, ...rest } = init;
  return new Response(body, {
    status: 200,
    ...rest,
    headers: { 'Content-Type': 'application/pdf', ...(headers || {}) },
  });
}

async function collect(nodeStream) {
  const chunks = [];
  for await (const chunk of nodeStream) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

describe('pdf-cache-fetch', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  describe('fetchUpstream', () => {
    it('rejects a non-whitelisted domain before ever calling fetch()', async () => {
      global.fetch = vi.fn();
      await expect(fetchUpstream('https://evil.com/a.pdf')).rejects.toThrow(PdfValidationError);
      expect(global.fetch).not.toHaveBeenCalled();
    });

    it('returns notModified on a 304', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
      const result = await fetchUpstream('https://zenodo.org/a.pdf');
      expect(result).toEqual({ notModified: true });
    });

    it('rejects a non-2xx status', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response('nope', { status: 500 }));
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/HTTP 500/);
    });

    it('rejects when the final URL (after redirects) is not whitelisted', async () => {
      const response = pdfResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
      Object.defineProperty(response, 'url', { value: 'https://evil.com/a.pdf' });
      global.fetch = vi.fn().mockResolvedValue(response);
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/Redirect/);
    });

    it('rejects a non-pdf content-type', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        new Response('<html>captcha</html>', { status: 200, headers: { 'Content-Type': 'text/html' } })
      );
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/content-type/);
    });

    it('returns fetch metadata on success, including expectedBytes from Content-Length', async () => {
      const body = new Uint8Array([0x25, 0x50, 0x44, 0x46]);
      global.fetch = vi.fn().mockResolvedValue(
        pdfResponse(body, { headers: { 'Content-Length': String(body.length), ETag: '"abc"', 'Last-Modified': 'Mon, 01 Jan 2024 00:00:00 GMT' } })
      );
      const result = await fetchUpstream('https://zenodo.org/a.pdf');
      expect(result.notModified).toBe(false);
      expect(result.expectedBytes).toBe(body.length);
      expect(result.etag).toBe('"abc"');
      expect(result.lastModified).toBe('Mon, 01 Jan 2024 00:00:00 GMT');
      expect(result.finalUrl).toBe('https://zenodo.org/a.pdf');
    });

    it('sends conditional headers through to fetch()', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
      await fetchUpstream('https://zenodo.org/a.pdf', {
        conditionalHeaders: { 'If-None-Match': '"abc"' },
      });
      const [, init] = global.fetch.mock.calls[0];
      expect(init.headers['If-None-Match']).toBe('"abc"');
    });
  });

  describe('buildConditionalHeaders', () => {
    it('returns an empty object with no existing sidecar', () => {
      expect(buildConditionalHeaders(null)).toEqual({});
    });

    it('builds If-None-Match / If-Modified-Since from the sidecar', () => {
      expect(buildConditionalHeaders({ etag: '"x"', lastModified: 'Mon' })).toEqual({
        'If-None-Match': '"x"',
        'If-Modified-Since': 'Mon',
      });
    });
  });

  describe('createValidatingStream', () => {
    function webStreamFrom(chunks) {
      return new ReadableStream({
        start(controller) {
          for (const chunk of chunks) controller.enqueue(chunk);
          controller.close();
        },
      });
    }

    it('passes through valid PDF bytes unchanged', async () => {
      const body = Buffer.from('%PDF-1.4 hello world');
      const validated = createValidatingStream(webStreamFrom([body]));
      await expect(collect(validated)).resolves.toEqual(body);
    });

    it('rejects a body that does not start with the PDF magic bytes', async () => {
      const body = Buffer.from('<html>not a pdf</html>');
      const validated = createValidatingStream(webStreamFrom([body]));
      await expect(collect(validated)).rejects.toThrow(/magic bytes/);
    });

    it('rejects a body shorter than the magic bytes', async () => {
      const validated = createValidatingStream(webStreamFrom([Buffer.from('%PD')]));
      await expect(collect(validated)).rejects.toThrow(/too short/);
    });

    it('rejects when the body exceeds maxBytes', async () => {
      const body = Buffer.from(`%PDF-1.4 ${'x'.repeat(100)}`);
      const validated = createValidatingStream(webStreamFrom([body]), { maxBytes: 10 });
      await expect(collect(validated)).rejects.toThrow(/exceeds/);
    });

    it('rejects when the actual size does not match expectedBytes (truncation)', async () => {
      const body = Buffer.from('%PDF-1.4 short');
      const validated = createValidatingStream(webStreamFrom([body]), { expectedBytes: body.length + 50 });
      await expect(collect(validated)).rejects.toThrow(/truncated/i);
    });

    it('accepts when the actual size matches expectedBytes exactly', async () => {
      const body = Buffer.from('%PDF-1.4 exact');
      const validated = createValidatingStream(webStreamFrom([body]), { expectedBytes: body.length });
      await expect(collect(validated)).resolves.toEqual(body);
    });

    it('validates magic bytes split across multiple small chunks', async () => {
      const full = Buffer.from('%PDF-1.4 chunked');
      const chunks = [full.subarray(0, 2), full.subarray(2, 4), full.subarray(4)];
      const validated = createValidatingStream(webStreamFrom(chunks));
      await expect(collect(validated)).resolves.toEqual(full);
    });
  });
});
