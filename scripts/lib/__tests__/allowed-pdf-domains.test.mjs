import { describe, it, expect } from 'vitest';
import { isAllowedPdfDomain as isAllowedWorkerSide } from '../allowed-pdf-domains.mjs';
// The TS side (src/utils/pdf.ts) reads the exact same JSON config — this
// test proves the two independent implementations agree, so the list can
// never silently diverge between the route and the worker.
import { isAllowedPdfDomain as isAllowedAppSide } from '../../../src/utils/pdf';

const SAMPLE_URLS = [
  'https://zenodo.org/record/1/file.pdf',
  'https://data.zenodo.org/record/1/file.pdf',
  'https://arxiv.org/pdf/1234',
  'https://export.arxiv.org/pdf/1234',
  'https://hal.archives-ouvertes.fr/hal-01/document',
  'https://hal.science/hal-01/document',
  'https://archive.softwareheritage.org/browse/origin/',
  'http://zenodo.org/record/1/file.pdf', // http, not https
  'https://evil.com/file.pdf',
  'https://evilzenodo.org/file.pdf',
  'https://zenodo.org.evil.com/file.pdf',
  'not a url',
];

describe('allowed-pdf-domains parity (app vs worker)', () => {
  it.each(SAMPLE_URLS)('agrees on %s', url => {
    expect(isAllowedWorkerSide(url)).toBe(isAllowedAppSide(url));
  });
});
