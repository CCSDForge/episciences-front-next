/** A single previewable file inside a repository deposit. */
export interface RepositoryPreviewFile {
  readonly id: string;
  readonly label: string;
  readonly embedUrl: string;
  readonly kind: 'image' | 'software';
}

/** Everything the client needs to render a preview, resolved server-side. */
export interface RepositoryPreview {
  readonly providerId: string;
  readonly identifier: string;
  readonly landingUrl: string;
  readonly files: readonly RepositoryPreviewFile[];
}

export interface RepositoryProvider {
  readonly id: string;
  /** Hosts this provider needs allowed in the nginx `frame-src` directive. */
  readonly frameSrc: readonly string[];
  /** Returns the normalized identifier, or null when the value does not belong to this provider. */
  match(value: string): string | null;
  landingUrl(identifier: string): string;
  /** Server-only. Never throws: returns files: [] on any failure. */
  resolve(identifier: string): Promise<RepositoryPreview>;
}
