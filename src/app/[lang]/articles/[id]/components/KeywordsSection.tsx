"use client";

import { AvailableLanguage, availableLanguages } from '@/utils/i18n';
import { getTextDirection, getLanguageLabel } from '@/utils/rtl-languages';

interface KeywordsSectionProps {
  keywordsData: any;
  currentLanguage: AvailableLanguage;
}

export default function KeywordsSection({ keywordsData, currentLanguage }: KeywordsSectionProps): JSX.Element | null {

  if (!keywordsData) {
    return null;
  }

  // If keywordsData is a simple array (no language separation)
  if (Array.isArray(keywordsData)) {
    if (keywordsData.length === 0) {
      return null;
    }

    return (
      <ul className="keywords-list">
        {keywordsData.map((keyword: string, index: number) => (
          <li className="articleDetails-content-article-section-content-keywords-tag" key={index}>
            {keyword}
          </li>
        ))}
      </ul>
    );
  }

  // If keywordsData is an object (possibly multilingual)
  // Group keywords by language - merge duplicates
  const keywordsMap: Map<string, Set<string>> = new Map();

  Object.entries(keywordsData).forEach(([key, values]) => {
    let targetLang = currentLanguage;

    // Check if key looks like a language code (2-3 lowercase letters)
    const isLanguageCode = /^[a-z]{2,3}(-[A-Z]{2})?$/.test(key);

    if (isLanguageCode) {
      // Accept any language code from the API, not just availableLanguages
      targetLang = key;
    }

    // Get or create the Set for this language
    if (!keywordsMap.has(targetLang)) {
      keywordsMap.set(targetLang, new Set());
    }
    const keywordSet = keywordsMap.get(targetLang)!;

    // Add keywords to the Set (automatically deduplicates)
    if (Array.isArray(values)) {
      values.forEach(keyword => {
        if (typeof keyword === 'string' && keyword.trim()) {
          keywordSet.add(keyword.trim());
        }
      });
    } else if (typeof values === 'string' && values.trim()) {
      keywordSet.add(values.trim());
    }
  });

  // Convert Map to Array format
  const keywordsByLanguage: Array<{ lang: string; keywords: string[] }> = [];
  keywordsMap.forEach((keywordSet, lang) => {
    if (keywordSet.size > 0) {
      keywordsByLanguage.push({
        lang,
        keywords: Array.from(keywordSet)
      });
    }
  });

  // If no keywords were extracted, return null
  if (keywordsByLanguage.length === 0) {
    return null;
  }

  // If only one language, render without language badge
  if (keywordsByLanguage.length === 1) {
    const { lang, keywords } = keywordsByLanguage[0];
    const direction = getTextDirection(lang);

    return (
      <ul className="keywords-list" dir={direction}>
        {keywords.map((keyword: string, index: number) => (
          <li className="articleDetails-content-article-section-content-keywords-tag" key={index}>
            {keyword}
          </li>
        ))}
      </ul>
    );
  }

  // Render keywords grouped by language with badges
  return (
    <div className="keywords-multilingual">
      {keywordsByLanguage.map(({ lang, keywords }, groupIndex) => {
        const direction = getTextDirection(lang);
        const languageLabel = getLanguageLabel(lang, currentLanguage);

        return (
          <div key={`${lang}-${groupIndex}`} className="language-group" dir={direction}>
            <div className="language-badge">{languageLabel}</div>
            <ul className="keywords-list">
              {keywords.map((keyword: string, index: number) => (
                <li className="articleDetails-content-article-section-content-keywords-tag" key={index}>
                  {keyword}
                </li>
              ))}
            </ul>
            {groupIndex < keywordsByLanguage.length - 1 && <div className="language-separator" />}
          </div>
        );
      })}
    </div>
  );
} 