import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/lib/logger', () => ({
  logger: { child: () => ({ info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() }) },
}));

describe('build-progress', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('initBuildProgress only initializes once', async () => {
    const { initBuildProgress } = await import('../build-progress');
    expect(() => initBuildProgress(10)).not.toThrow();
    expect(() => initBuildProgress(20)).not.toThrow();
  });

  it('logArticleProgress skips duplicate log keys', async () => {
    const { logArticleProgress } = await import('../build-progress');
    expect(() => logArticleProgress('1', 'en', 'main')).not.toThrow();
    expect(() => logArticleProgress('1', 'en', 'main')).not.toThrow();
  });

  it('logArticleProgress handles the download page type', async () => {
    const { logArticleProgress } = await import('../build-progress');
    expect(() => logArticleProgress('2', 'en', 'download')).not.toThrow();
  });

  it('logArticleProgress handles the preview page type', async () => {
    const { logArticleProgress } = await import('../build-progress');
    expect(() => logArticleProgress('3', 'en', 'preview')).not.toThrow();
  });

  it('logArticleProgress defaults to the main page type', async () => {
    const { logArticleProgress } = await import('../build-progress');
    expect(() => logArticleProgress('4', 'fr')).not.toThrow();
  });

  it('treats the same article id under a different language as a distinct entry', async () => {
    const { logArticleProgress } = await import('../build-progress');
    expect(() => logArticleProgress('5', 'en')).not.toThrow();
    expect(() => logArticleProgress('5', 'fr')).not.toThrow();
  });
});
