import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import JournalLayout from '../layout';
import { loadJournalConfig } from '@/utils/env-loader';

vi.mock('@/utils/env-loader', () => ({
  loadJournalConfig: vi.fn(),
}));

function mockConfig(env: Record<string, string>): void {
  vi.mocked(loadJournalConfig).mockReturnValue({ code: 'journal', env });
}

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

  it('injects a style tag with the expected CSS custom property names', async () => {
    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const { container } = render(jsx);

    // In happy-dom a <style> element rendered via dangerouslySetInnerHTML stays in the
    // render container rather than hoisting to document.head; check both to be safe.
    const style = container.querySelector('style') ?? document.head.querySelector('style');
    expect(style).not.toBeNull();

    const cssText = style!.innerHTML;
    expect(cssText).toContain('--primary:');
    expect(cssText).toContain('--primary-text:');
    expect(cssText).toContain('--primary-text-aaa:');
    expect(cssText).toContain('--primary-text-large:');
    expect(cssText).toContain('--primary-text-on-gray:');
    expect(cssText).toContain('--primary-text-on-dark:');
    expect(cssText).toContain('--primary-border:');
    expect(cssText).toContain('--link-color:');
    expect(cssText).toContain('--link-hover-color:');
    expect(cssText).toContain('--heading-color:');
    expect(cssText).toContain('--button-text-on-primary-bg:');
    expect(cssText).toContain('--focus-color:');
    expect(cssText).toContain('--focus-color-on-primary:');
    expect(cssText).toContain('--focus-color-on-dark:');
    expect(cssText).toMatch(/^:root\{/);
  });

  it('uses the configured primary color to derive the CSS variables', async () => {
    mockConfig({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#336699' });

    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const { container } = render(jsx);
    const style = container.querySelector('style') ?? document.head.querySelector('style');

    expect(style!.innerHTML).toContain('--primary:#336699');
  });

  // Security-relevant: sanitizeCssValue must strip anything that could break out of
  // the <style> tag (e.g. a malicious primary-text-color override from journal config).
  it('sanitizes a malicious CSS value to prevent </style> breakout / script injection', async () => {
    mockConfig({
      NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#000000',
      NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR: '</style><script>alert(1)</script>',
    });

    const jsx = await JournalLayout({
      params: Promise.resolve({ journalId: 'journal' }),
      children: <div>content</div>,
    });
    const { container } = render(jsx);
    const style = container.querySelector('style') ?? document.head.querySelector('style');
    const cssText = style!.innerHTML;

    // The sanitizer strips any character outside [a-zA-Z0-9%.,() ] (plus '#'), so all
    // angle brackets and slashes are removed — no tag can be reconstructed even though
    // inert letters like "script" may remain as harmless plain text.
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
    const { container } = render(jsx);
    const style = container.querySelector('style') ?? document.head.querySelector('style');

    expect(style!.innerHTML).toContain('--primary:#000000');
  });
});
