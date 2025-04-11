import { API_URL } from '@/config/api';

export const defaultLanguage: string = process.env.NEXT_PUBLIC_JOURNAL_DEFAULT_LANGUAGE || 'en';

export const availableLanguages = process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES
  ? process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES.split(',')
  : [defaultLanguage];

export type AvailableLanguage = typeof availableLanguages[number];

export const getTranslations = async (language: AvailableLanguage = defaultLanguage) => {
  const response = await fetch(`${API_URL}/translations/${language}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch translations for language ${language}`);
  }
  return response.json();
};

export const fetchTranslations = async (language: AvailableLanguage = defaultLanguage) => {
  try {
    return await getTranslations(language);
  } catch (error) {
    console.error('Error fetching translations:', error);
    return null;
  }
}; 