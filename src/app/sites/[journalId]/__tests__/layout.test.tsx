import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JournalLayout, { safeColor } from '../layout';
import { loadJournalConfig } from '@/utils/env-loader';

vi.mock('@/utils/env-loader', () => ({
  loadJournalConfig: vi.fn(),
}));

function mockConfig(env: Record<string, string>): void {
  vi.mocked(loadJournalConfig).mockReturnValue({ code: 'journal', env });
}

function getStyleText(container: HTMLElement): string {
  const style = container.querySelector('style') ?? document.head.querySelector('style');
  expect(style).not.toBeNull();
  return style!.innerHTML;
}

describe('safeColor', () => {
  it('accepts hex colors of every valid length', () => {
    for (const v of ['#abc', '#abcd', '#aabbcc', '#aabbccdd']) {
      expect(safeColor(v, 'fallback')).toBe(v);
    }
  });

  it('accepts oklch() colors', () => {
    expect(safeColor('oklch(0.7 0.1 250)', 'fallback')).toBe('oklch(0.7 0.1 250)');
    expect(safeColor('oklch(70% 0.1 250deg / 50%)', 'fallback')).toBe('oklch(70% 0.1 250deg / 50%)');
  });

  it('rejects a </style> breakout attempt', () => {
    expect(safeColor('</style><script>alert(1)</script>', 'fallback')).toBe('fallback');
  });

  it('rejects url(...) and var(...) — never issued by our own generators, but defense in depth', () => {
    expect(safeColor('url(javascript:alert(1))', 'fallback')).toBe('fallback');
    expect(safeColor('var(--x)', 'fallback')).toBe('fallback');
  });

  it('rejects a bare CSS injection payload', () => {
    expect(safeColor('red;} body{background:url(x)', 'fallback')).toBe('fallback');
  });
});

describe('JournalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConfig({});
  });

  it('renders the children', async () => {
    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div data-testid="child">Hello</div>,
    });
    const { getByTestId } = render(jsx);

    expect(getByTestId('child')).toHaveTextContent('Hello');
  });

  it('injects a style tag with light/dark pairs for every L1 token', async () => {
    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const { container } = render(jsx);
    const cssText = getStyleText(container);

    for (const token of [
      'primary-light',
      'primary-dark',
      'primary-text-light',
      'primary-text-dark',
      'primary-border-light',
      'primary-border-dark',
      'button-text-on-primary-bg-light',
      'button-text-on-primary-bg-dark',
      'focus-color-light',
      'focus-color-dark',
      'focus-color-on-primary-light',
      'focus-color-on-primary-dark',
      'focus-color-on-dark-dark',
      'surface-dark',
      'surface-2-dark',
      'surface-raised-dark',
      'text-strong-dark',
      'text-dark',
      'text-muted-dark',
      'border-dark',
    ]) {
      expect(cssText).toContain(`--${token}:`);
    }
    expect(cssText).toMatch(/^:root\{/);
  });

  it('uses the configured primary color to derive the CSS variables', async () => {
    mockConfig({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#336699' });

    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const cssText = getStyleText(render(jsx).container);

    // Light mode is a no-op pass-through of the raw brand color.
    expect(cssText).toContain('--primary-light:#336699');
  });

  // Security-relevant: a malicious override must never reach the emitted <style>,
  // even as a substring — safeColor rejects the whole value rather than mangling it.
  it('rejects a malicious CSS value to prevent </style> breakout / script injection', async () => {
    mockConfig({
      NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#000000',
      NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR: '</style><script>alert(1)</script>',
    });

    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const cssText = getStyleText(render(jsx).container);

    expect(cssText).not.toContain('</style>');
    expect(cssText).not.toContain('<script>');
    expect(cssText).not.toMatch(/[<>/]/);
  });

  it('falls back to a default primary color when none is configured', async () => {
    mockConfig({});

    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const cssText = getStyleText(render(jsx).container);

    expect(cssText).toContain('--primary-light:#000000');
  });
});
