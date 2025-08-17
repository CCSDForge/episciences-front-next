"use client";

import { AvailableLanguage, availableLanguages } from '@/utils/i18n';

interface KeywordsSectionProps {
  keywordsData: any;
  currentLanguage: AvailableLanguage;
}

export default function KeywordsSection({ keywordsData, currentLanguage }: KeywordsSectionProps): JSX.Element | null {
  console.log('KeywordsSection - keywordsData:', keywordsData);
  console.log('KeywordsSection - currentLanguage:', currentLanguage);
  
  const getKeywords = (): string[] => {
    const keywordsList: string[] = [];

    if (!keywordsData) {
      console.log('KeywordsSection - No keywordsData, returning empty array');
      return keywordsList;
    }

    if (Array.isArray(keywordsData)) {
      return keywordsData;
    }

    Object.entries(keywordsData).forEach(([key, values]) => {
      console.log('Processing keyword entry:', key, values);
      
      if (availableLanguages.includes(key as AvailableLanguage)) {
        if (key === currentLanguage) {
          if (Array.isArray(values)) {
            keywordsList.push(...values);
          } else if (typeof values === 'string') {
            keywordsList.push(values);
          }
        }
      } else {
        // Handle numeric keys or other non-language keys
        if (Array.isArray(values)) {
          keywordsList.push(...values);
        } else if (typeof values === 'string') {
          keywordsList.push(values);
        }
      }
    });

    return keywordsList;
  };

  const keywordsList = getKeywords();
  console.log('KeywordsSection - final keywordsList:', keywordsList);
  console.log('KeywordsSection - keywordsList.length:', keywordsList.length);
  
  if (!keywordsList.length) {
    console.log('KeywordsSection - No keywords to display, returning null');
    return null;
  }

  return (
    <ul>
      {keywordsList.map((keyword: string, index: number) => (
        <li className="articleDetails-content-article-section-content-keywords-tag" key={index}>
          {keyword}
        </li>
      ))}
    </ul>
  );
} 