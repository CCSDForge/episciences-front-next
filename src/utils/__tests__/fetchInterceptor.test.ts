import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockGetJournalCode = vi.fn((): string => '');

vi.mock('@/utils/static-build', () => ({
  getJournalCode: () => mockGetJournalCode(),
}));

vi.mock('@/lib/logger', () => ({
  logger: {
    child: () => ({
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    }),
  },
}));

const realFetch = globalThis.fetch;

/**
 * Install a mock as the "original" fetch, then (re-)import the interceptor
 * so it wraps our mock. Returns the mock for assertions.
 */
async function installInterceptor(mock: ReturnType<typeof vi.fn>) {
  globalThis.fetch = mock as unknown as typeof fetch;
  vi.resetModules();
  await import('../fetchInterceptor');
  return mock;
}

function okResponse() {
  return new Response('ok', { status: 200 });
}

describe('fetchInterceptor', () => {
  beforeEach(() => {
    mockGetJournalCode.mockReturnValue('');
  });

  afterEach(() => {
    globalThis.fetch = realFetch;
    vi.useRealTimers();
  });

  it('replaces rvcode=default with the current journal code', async () => {
    mockGetJournalCode.mockReturnValue('epijinfo');
    const mock = await installInterceptor(vi.fn().mockResolvedValue(okResponse()));

    await globalThis.fetch('https://api.test/pages?rvcode=default');

    expect(mock).toHaveBeenCalledWith(
      'https://api.test/pages?rvcode=epijinfo',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('strips only a trailing /default segment', async () => {
    const mock = await installInterceptor(vi.fn().mockResolvedValue(okResponse()));

    await globalThis.fetch('https://api.test/default-foo/pages/default');

    expect(mock).toHaveBeenCalledWith(
      'https://api.test/default-foo/pages/',
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it('preserves method and body when called with a Request object', async () => {
    const mock = await installInterceptor(vi.fn().mockResolvedValue(okResponse()));

    const request = new Request('https://api.test/papers', {
      method: 'POST',
      body: JSON.stringify({ title: 'hello' }),
      headers: { 'Content-Type': 'application/json' },
    });
    await globalThis.fetch(request);

    const [target] = mock.mock.calls[0];
    expect(target).toBeInstanceOf(Request);
    expect((target as Request).method).toBe('POST');
    expect(await (target as Request).text()).toBe(JSON.stringify({ title: 'hello' }));
  });

  it('passes an abort signal that fires on timeout (real cancellation)', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const mock = vi.fn((_input: RequestInfo, init?: RequestInit) => {
      receivedSignal = init?.signal ?? undefined;
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      });
    });
    await installInterceptor(mock as unknown as ReturnType<typeof vi.fn>);

    const pending = globalThis.fetch('https://api.test/slow');
    const assertion = expect(pending).rejects.toThrow('Request timeout');

    await vi.advanceTimersByTimeAsync(15001);
    await assertion;
    expect(receivedSignal?.aborted).toBe(true);
  });

  it('combines the caller signal with the timeout signal', async () => {
    const mock = vi.fn((_input: RequestInfo, init?: RequestInit) => {
      return new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(init.signal!.reason));
      });
    });
    await installInterceptor(mock as unknown as ReturnType<typeof vi.fn>);

    const controller = new AbortController();
    const pending = globalThis.fetch('https://api.test/slow', { signal: controller.signal });
    const assertion = expect(pending).rejects.toThrow();

    controller.abort(new Error('caller aborted'));
    await assertion;
  });
});
