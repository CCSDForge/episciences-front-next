/**
 * Truncates a string if it exceeds a maximum length.
 *
 * @param text The string to truncate
 * @param maxLength The maximum length before truncation
 * @param suffix The suffix to add after truncation (default: '...')
 * @returns The truncated string
 */
export function truncate(text: string | undefined, maxLength: number, suffix: string = '...'): string {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}${suffix}`;
}
