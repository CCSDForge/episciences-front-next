/** Member of a section or volume committee, as returned by the API. */
export interface ICommitteeMember {
  uuid: string;
  screenName: string;
  civ?: string;
  /** Bare ORCID iD (e.g. `0000-0003-3165-5678`); the API sends `''` or `null` when unknown. */
  orcid?: string | null;
}
