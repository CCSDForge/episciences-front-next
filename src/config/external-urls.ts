export const ORCID_URL = process.env.NEXT_PUBLIC_ORCID_HOMEPAGE || 'https://orcid.org';
export const DOI_URL = process.env.NEXT_PUBLIC_DOI_HOMEPAGE || 'https://doi.org';

export const buildDoiUrl = (doi: string): string =>
  doi.startsWith('http') ? doi : `${DOI_URL}/${doi}`;

export const buildOrcidUrl = (orcid: string): string =>
  orcid.startsWith('http') ? orcid : `${ORCID_URL}/${orcid}`;
export const ARXIV_URL = process.env.NEXT_PUBLIC_ARXIV_HOMEPAGE || 'https://arxiv.org';
export const HAL_URL = process.env.NEXT_PUBLIC_HAL_HOMEPAGE || 'https://hal.science';
export const SOFTWARE_HERITAGE_URL =
  process.env.NEXT_PUBLIC_ARCHIVE_SOFTWARE_HERITAGE_HOMEPAGE ||
  'https://archive.softwareheritage.org';
export const TWITTER_URL = process.env.NEXT_PUBLIC_TWITTER_HOMEPAGE || 'https://x.com';
export const MATHJAX_URL =
  process.env.NEXT_PUBLIC_MATHJAX_HOMEPAGE || 'https://cdnjs.cloudflare.com/ajax/libs/mathjax';
export const ZOTERO_URL = process.env.NEXT_PUBLIC_ZOTERO_HOMEPAGE || 'https://www.zotero.org';
export const CREATIVE_COMMONS_URL =
  process.env.NEXT_PUBLIC_CREATIVE_COMMONS_HOMEPAGE || 'https://creativecommons.org';
