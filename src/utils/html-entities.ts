import he from 'he';

/**
 * Decode HTML entities in text coming from external APIs. Some upstream
 * sources double-encode content (e.g. "&amp;quot;" instead of `"`), so
 * decoding repeatedly until the output stabilizes resolves any encoding depth.
 */
export function decodeHtmlEntities(text: string): string {
  let decoded = text;
  for (let i = 0; i < 5; i++) {
    const next = he.decode(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded;
}

/** Apply {@link decodeHtmlEntities} to every value of a lang → text record. */
export function decodeHtmlEntitiesRecord<T extends Record<string, string>>(
  record?: T
): T | undefined {
  if (!record) return record;
  return Object.fromEntries(
    Object.entries(record).map(([lang, text]) => [lang, decodeHtmlEntities(text)])
  ) as T;
}
