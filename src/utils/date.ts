import { AvailableLanguage } from "./i18n"

const parseDate = (dateString: string): Date | null => {
  // Essayer différents formats de date
  const formats = [
    // Format ISO avec timezone
    (str: string) => {
      const date = new Date(str);
      return !isNaN(date.getTime()) ? date : null;
    },
    // Format DD/MM/YYYY
    (str: string) => {
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      const [day, month, year] = parts.map(p => parseInt(p, 10));
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      const date = new Date(year, month - 1, day);
      return !isNaN(date.getTime()) ? date : null;
    },
    // Format YYYY-MM-DD
    (str: string) => {
      const parts = str.split('-');
      if (parts.length !== 3) return null;
      const [year, month, day] = parts.map(p => parseInt(p, 10));
      if (isNaN(day) || isNaN(month) || isNaN(year)) return null;
      const date = new Date(year, month - 1, day);
      return !isNaN(date.getTime()) ? date : null;
    }
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
    const date = new Date(dateString);
    if (!isNaN(date.getTime())) {
      return date;
    }
  } catch (e) {
    console.error('Error parsing date with default constructor:', e);
  }

  return null;
};

export const formatDate = (dateString: string | undefined, language: AvailableLanguage, overridedOptions?: Intl.DateTimeFormatOptions): string => {
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
      ...overridedOptions,
    }

    return new Intl.DateTimeFormat(language, options).format(date);
  } catch (error) {
    console.error('Error formatting date:', error, 'dateString:', dateString);
    return '';
  }
} 