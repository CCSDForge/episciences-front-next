import { METADATA_TYPE } from './article';

export function getJournalBaseUrl(journalId: string): string {
  const domain = process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN || 'episciences.org';
  return `https://${journalId}.${domain}`;
}

// Aligned with getMetadataTypes() — only formats actually exposed by the backend
export const SIGNPOSTING_FORMATS: Array<{ format: METADATA_TYPE; type: string; profile?: string }> =
  [
    { format: METADATA_TYPE.TEI, type: 'application/xml', profile: 'http://www.tei-c.org/ns/1.0' },
    {
      format: METADATA_TYPE.DC,
      type: 'application/xml',
      profile: 'http://purl.org/dc/elements/1.1/',
    },
    {
      format: METADATA_TYPE.CROSSREF,
      type: 'application/xml',
      profile: 'http://www.crossref.org/schema/5.3.1',
    },
    { format: METADATA_TYPE.ZBJATS, type: 'application/xml' },
    { format: METADATA_TYPE.DOAJ, type: 'application/json' },
    { format: METADATA_TYPE.BIBTEX, type: 'application/x-bibtex' },
    { format: METADATA_TYPE.CSL, type: 'application/vnd.citationstyles.csl+json' },
    {
      format: METADATA_TYPE.OPENAIRE,
      type: 'application/xml',
      profile: 'http://namespace.openaire.eu/schema/oaire/',
    },
    { format: METADATA_TYPE.JSON, type: 'application/json' },
  ];
