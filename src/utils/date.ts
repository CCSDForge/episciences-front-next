import { AvailableLanguage } from './i18n';

// Helper: validates that a Date object is valid
const createValidDate = (date: Date): Date | null => {
  return !isNaN(date.getTime()) ? date : null;
};

// Helper: parses date parts and creates a Date object
const parseDateParts = (
  parts: string[],
  yearIndex: number,
  monthIndex: number,
  dayIndex: number
): Date | null => {
  if (parts.length !== 3) return null;

  const parsed = parts.map(p => parseInt(p, 10));
  if (parsed.some(isNaN)) return null;

  const year = parsed[yearIndex];
  const month = parsed[monthIndex];
  const day = parsed[dayIndex];

  return createValidDate(new Date(year, month - 1, day));
};

const parseDate = (dateString: string): Date | null => {
  // Essayer différents formats de date
  const formats = [
    // Format ISO avec timezone
    (str: string) => createValidDate(new Date(str)),
    // Format DD/MM/YYYY
    (str: string) => parseDateParts(str.split('/'), 2, 1, 0),
    // Format YYYY-MM-DD
    (str: string) => parseDateParts(str.split('-'), 0, 1, 2),
  ];

  for (const format of formats) {
    try {
      const date = format(dateString);
      if (date) {
        return date;
      }
    } catch (e) {
      console.error('Error parsing date:', e);
      continue;
    }
  }

  // Si aucun format ne fonctionne, essayer directement avec new Date()
  try {
    const date = createValidDate(new Date(dateString));
    if (date) {
      return date;
    }
  } catch (e) {
    console.error('Error parsing date with default constructor:', e);
  }

  return null;
};

export const formatDateForScholar = (dateString: string | undefined): string => {
  if (!dateString) return '';
  // YYYY-MM-DD or YYYY-MM-DDTHH:... — extract parts directly to avoid timezone shift
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}/${isoMatch[2]}/${isoMatch[3]}`;
  // DD/MM/YYYY
  const dmyMatch = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (dmyMatch) return `${dmyMatch[3]}/${dmyMatch[2]}/${dmyMatch[1]}`;
  // Fallback: use local time methods (consistent with parseDateParts local construction)
  const date = parseDate(dateString);
  if (!date) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}/${m}/${d}`;
};

export const formatDate = (
  dateString: string | undefined,
  language: AvailableLanguage,
  overridedOptions?: Intl.DateTimeFormatOptions
): string => {
  if (!dateString) return '';

  try {
    const date = parseDate(dateString);
    if (!date) {
      console.error('Could not parse date:', dateString);
      return '';
    }

    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
      ...overridedOptions,
    };

    return new Intl.DateTimeFormat(language, options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, 'dateString:', dateString);
    return '';
  }
};
