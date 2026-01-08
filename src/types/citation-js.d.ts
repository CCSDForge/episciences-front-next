/**
 * Type declarations for citation-js and its plugins
 * These modules don't provide their own TypeScript definitions
 */

declare module 'citation-js' {
  export class Cite {
    constructor(data: any, options?: any);
    format(
      style: string,
      options?: {
        format?: string;
        template?: string;
        lang?: string;
      }
    ): string;
    data: any;
  }
  export default Cite;
}

declare module '@citation-js/plugin-csl' {
  // CSL plugin - auto-registers when imported
  // No exports needed
}

declare module '@citation-js/plugin-doi' {
  // DOI plugin - auto-registers when imported
  // No exports needed
}

declare module '@citation-js/core' {
  export class Cite {
    constructor(data: any, options?: any);
    format(style: string, options?: any): string;
    data: any;
  }
  export default Cite;
}
