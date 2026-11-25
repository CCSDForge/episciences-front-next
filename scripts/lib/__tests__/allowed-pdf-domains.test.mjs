import { describe, it, expect } from 'vitest';
import {
  isAllowedPdfDomain as isAllowedWorkerSide,
  isMutablePdfUrl as isMutableWorkerSide,
} from '../allowed-pdf-domains.mjs';
// The TS side (src/utils/pdf.ts) reads the exact same JSON config — this
// test proves the two independent implementations agree, so the list can
// never silently diverge between the route and the worker.
import {
  isAllowedPdfDomain as isAllowedAppSide,
  isMutablePdfUrl as isMutableAppSide,
} from '../../../src/utils/pdf';

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

// [url, expected isMutablePdfUrl]
const MUTABILITY_CASES = [
  ['https://arxiv.org/pdf/2101.00001', true],
  ['https://arxiv.org/pdf/2101.00001.pdf', true],
  ['https://arxiv.org/pdf/0704.0001', true],
  ['https://export.arxiv.org/pdf/2101.12345', true],
  ['https://arxiv.org/pdf/math/0601001', true],
  ['https://arxiv.org/pdf/math.AG/0601001', true],
  ['https://arxiv.org/pdf/hep-th/9901001.pdf', true],
  ['https://arxiv.org/pdf/2101.00001v2', false],
  ['https://arxiv.org/pdf/2101.00001v2.pdf', false],
  ['https://arxiv.org/pdf/math/0601001v1', false],
  ['https://arxiv.org/abs/2101.00001', false],
  ['https://zenodo.org/pdf/2101.00001', false],
  ['https://arxiv.org.evil.com/pdf/2101.00001', false],
  ['not a url', false],
];

describe('allowed-pdf-domains parity (app vs worker)', () => {
  it.each(SAMPLE_URLS)('agrees on %s', url => {
    expect(isAllowedWorkerSide(url)).toBe(isAllowedAppSide(url));
  });
});

describe('isMutablePdfUrl (unversioned arXiv), both sides', () => {
  it.each(MUTABILITY_CASES)('%s -> %s', (url, expected) => {
    expect(isMutableWorkerSide(url)).toBe(expected);
    expect(isMutableAppSide(url)).toBe(expected);
  });
});
