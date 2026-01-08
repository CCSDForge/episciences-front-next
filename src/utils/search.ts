import { AvailableLanguage } from './i18n';
import { SearchRange } from './pagination';

export const formatSearchRange = (
  range?: SearchRange
): {
  years: { value: number; count: number }[];
  types: { value: string; count: number }[];
  volumes: Record<'en' | 'fr', Record<number, string>[]>;
  sections: Record<'en' | 'fr', Record<number, string>[]>;
  authors: { value: string; count: number }[];
} => {
  const searchRange = range as {
    year?: Record<string, number>;
    type?: Record<string, number>;
    volume?: Record<AvailableLanguage, Record<string, Record<string, number>>>;
    section?: Record<AvailableLanguage, Record<string, Record<string, number>>>;
    author?: Record<string, number>;
  };

  let years: { value: number; count: number }[] = [];
  if (searchRange.year) {
    years = Object.entries(searchRange.year).map(y => ({
      value: parseInt(y[0]),
      count: y[1],
    }));
  }

  let types: { value: string; count: number }[] = [];
  if (searchRange.type) {
    types = Object.entries(searchRange.type).map(t => ({
      value: t[0],
      count: t[1],
    }));
  }

  let volumes: Record<AvailableLanguage, Record<number, string>[]> = {
    en: [],
    fr: [],
  };
  if (searchRange.volume) {
    volumes = Object.entries(searchRange.volume).reduce(
      (acc, [language, sectionData]) => {
        acc[language as AvailableLanguage] = formatVolumeOrSection(sectionData);
        return acc;
      },
      {} as Record<AvailableLanguage, Record<number, string>[]>
    );
  }

  let sections: Record<AvailableLanguage, Record<number, string>[]> = {
    en: [],
    fr: [],
  };
  if (searchRange.section) {
    sections = Object.entries(searchRange.section).reduce(
      (acc, [language, sectionData]) => {
        acc[language as AvailableLanguage] = formatVolumeOrSection(sectionData);
        return acc;
      },
      {} as Record<AvailableLanguage, Record<number, string>[]>
    );
  }

  let authors: { value: string; count: number }[] = [];
  if (searchRange.author) {
    authors = Object.entries(searchRange.author).map(a => ({
      value: a[0],
      count: a[1],
    }));
  }

  return {
    years,
    types,
    volumes,
    sections,
    authors,
  };
};

const formatVolumeOrSection = (
  data: Record<string, Record<string, number>>
): Record<number, string>[] => {
  return Object.entries(data).map(([id, titleObj]) => {
    const title = Object.keys(titleObj)[0];
    return { [parseInt(id)]: title };
  });
};
