import { METADATA_TYPE } from './article';

export function getJournalBaseUrl(journalId: string): string {
  const domain = process.env.NEXT_PUBLIC_EPISCIENCES_DOMAIN || 'episciences.org';
  return `https://${journalId}.${domain}`;
}

export const SIGNPOSTING_FORMATS: Array<{ format: METADATA_TYPE; type: string }> = [
  { format: METADATA_TYPE.BIBTEX, type: 'application/x-bibtex' },
  { format: METADATA_TYPE.RIS, type: 'application/x-research-info-systems' },
  { format: METADATA_TYPE.CSL, type: 'application/vnd.citationstyles.csl+json' },
  { format: METADATA_TYPE.JSON_LD, type: 'application/ld+json' },
  { format: METADATA_TYPE.TEI, type: 'application/xml' },
  { format: METADATA_TYPE.DC, type: 'application/xml' },
  { format: METADATA_TYPE.DUBLIN_CORE, type: 'application/xml' },
  { format: METADATA_TYPE.CROSSREF, type: 'application/xml' },
  { format: METADATA_TYPE.ZBJATS, type: 'application/xml' },
  { format: METADATA_TYPE.DOAJ, type: 'application/json' },
  { format: METADATA_TYPE.OPENAIRE, type: 'application/xml' },
  { format: METADATA_TYPE.JSON, type: 'application/json' },
];
