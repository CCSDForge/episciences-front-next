import { render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MarkdownImage from '../MarkdownImage';

let storeRvcode: string | undefined;

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: (state: unknown) => unknown) =>
    selector({
      journalReducer: { currentJournal: storeRvcode ? { code: storeRvcode } : undefined },
    }),
}));

vi.mock('next/image', () => ({
  default: ({ src, alt }: { src: string; alt: string }) => <img src={src} alt={alt} />,
}));

const renderSrc = (src: string): string | null =>
  render(<MarkdownImage src={src} alt="x" />)
    .container.querySelector('img')!
    .getAttribute('src');

describe('MarkdownImage', () => {
  afterEach(() => {
    storeRvcode = undefined;
    vi.unstubAllEnvs();
  });

  it('rewrites /public/ paths against the journal host', () => {
    storeRvcode = 'journal-code';
    expect(renderSrc('/public/logo.png')).toBe(
      'https://journal-code.episciences.org/public/logo.png'
    );
  });

  it('rewrites root-relative paths against the journal host', () => {
    storeRvcode = 'journal-code';
    expect(renderSrc('/journal-code/resources/a.jpg')).toBe(
      'https://journal-code.episciences.org/journal-code/resources/a.jpg'
    );
  });

  it('prefers NEXT_PUBLIC_JOURNAL_RVCODE over the store', () => {
    vi.stubEnv('NEXT_PUBLIC_JOURNAL_RVCODE', 'arima-preprod');
    storeRvcode = 'other';
    expect(renderSrc('/arima-preprod/resources/a.jpg')).toBe(
      'https://arima-preprod.episciences.org/arima-preprod/resources/a.jpg'
    );
  });

  it('leaves root-relative paths untouched when no journal code is known', () => {
    vi.stubEnv('NEXT_PUBLIC_JOURNAL_RVCODE', '');
    expect(renderSrc('/x/resources/a.jpg')).toBe('/x/resources/a.jpg');
  });

  it('leaves absolute and protocol-relative URLs untouched', () => {
    storeRvcode = 'journal-code';
    expect(renderSrc('https://cdn.example.com/a.png')).toBe('https://cdn.example.com/a.png');
    expect(renderSrc('//cdn.example.com/a.png')).toBe('//cdn.example.com/a.png');
  });
});
