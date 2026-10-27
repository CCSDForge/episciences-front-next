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

function redirectResponse(location, status = 302) {
  return new Response(null, { status, headers: location ? { Location: location } : {} });
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

    it('rejects a redirect to a non-whitelisted host without ever requesting it', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(redirectResponse('http://169.254.169.254/latest/meta-data/'));
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toMatchObject({
        code: 'REDIRECT_NOT_ALLOWED',
      });
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch.mock.calls[0][1].redirect).toBe('manual');
    });

    it('follows whitelisted redirects, resolving relative locations, and reports the final URL', async () => {
      global.fetch = vi
        .fn()
        .mockResolvedValueOnce(redirectResponse('https://data.zenodo.org/x'))
        .mockResolvedValueOnce(redirectResponse('/a.pdf', 307))
        .mockResolvedValueOnce(pdfResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46])));
      const result = await fetchUpstream('https://zenodo.org/a.pdf');
      expect(result.finalUrl).toBe('https://data.zenodo.org/a.pdf');
      expect(global.fetch.mock.calls.map(call => call[0])).toEqual([
        'https://zenodo.org/a.pdf',
        'https://data.zenodo.org/x',
        'https://data.zenodo.org/a.pdf',
      ]);
    });

    it('gives up after too many redirects', async () => {
      global.fetch = vi.fn().mockImplementation(async () => redirectResponse('https://zenodo.org/loop'));
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/Too many redirects/);
      expect(global.fetch).toHaveBeenCalledTimes(6);
    });

    it('rejects a redirect without a Location header', async () => {
      global.fetch = vi.fn().mockResolvedValueOnce(redirectResponse(null));
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/without Location/);
    });

    it('asks upstream for an unencoded body', async () => {
      global.fetch = vi.fn().mockResolvedValue(new Response(null, { status: 304 }));
      await fetchUpstream('https://zenodo.org/a.pdf');
      expect(global.fetch.mock.calls[0][1].headers['Accept-Encoding']).toBe('identity');
    });

    it('ignores Content-Length when the body is content-encoded', async () => {
      global.fetch = vi.fn().mockResolvedValue(
        pdfResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]), {
          headers: { 'Content-Length': '2', 'Content-Encoding': 'gzip' },
        })
      );
      const result = await fetchUpstream('https://zenodo.org/a.pdf');
      expect(result.expectedBytes).toBeUndefined();
    });

    it.each(['abc', '-1', '1.5', ''])('ignores a malformed Content-Length %j', async value => {
      const response = pdfResponse(new Uint8Array([0x25, 0x50, 0x44, 0x46]));
      // Response normalizes Content-Length itself, so stub the header read.
      const realGet = response.headers.get.bind(response.headers);
      vi.spyOn(response.headers, 'get').mockImplementation(name =>
        name.toLowerCase() === 'content-length' ? value : realGet(name)
      );
      global.fetch = vi.fn().mockResolvedValue(response);
      const result = await fetchUpstream('https://zenodo.org/a.pdf');
      expect(result.expectedBytes).toBeUndefined();
    });

    it('cancels the upstream body when rejecting it', async () => {
      const cancel = vi.fn();
      const body = new ReadableStream({ pull() {}, cancel });
      global.fetch = vi
        .fn()
        .mockResolvedValue(new Response(body, { status: 200, headers: { 'Content-Type': 'text/html' } }));
      await expect(fetchUpstream('https://zenodo.org/a.pdf')).rejects.toThrow(/content-type/);
      expect(cancel).toHaveBeenCalled();
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

    it('destroys the upstream source when validation fails', async () => {
      const cancel = vi.fn();
      const source = new ReadableStream({
        pull(controller) {
          controller.enqueue(Buffer.from('<html>captcha page</html>'));
        },
        cancel,
      });
      const validated = createValidatingStream(source);
      await expect(collect(validated)).rejects.toThrow(/magic bytes/);
      await vi.waitFor(() => expect(cancel).toHaveBeenCalled());
    });

    it('validates magic bytes split across multiple small chunks', async () => {
      const full = Buffer.from('%PDF-1.4 chunked');
      const chunks = [full.subarray(0, 2), full.subarray(2, 4), full.subarray(4)];
      const validated = createValidatingStream(webStreamFrom(chunks));
      await expect(collect(validated)).resolves.toEqual(full);
    });
  });
});
