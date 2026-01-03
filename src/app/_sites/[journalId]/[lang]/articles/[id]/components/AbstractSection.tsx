"use client";

import { MathJax } from 'better-react-mathjax';
import { getTextDirection, getLanguageLabel } from '@/utils/rtl-languages';

interface AbstractSectionProps {
  abstractData: any;
  currentLanguage: string;
}

export default function AbstractSection({ abstractData, currentLanguage }: AbstractSectionProps): JSX.Element | null {

  // If abstractData is empty or null, return null
  if (!abstractData) {
    return null;
  }

  // If abstractData is a simple string, render it as a single abstract
  if (typeof abstractData === 'string') {
    if (!abstractData.trim()) {
      return null;
    }

    return (
      <div className="abstract-single">
        <MathJax dynamic>{abstractData}</MathJax>
      </div>
    );
  }

  // If abstractData is an object (multilingual abstracts)
  const abstracts: Array<{ lang: string; content: string }> = [];

  // Extract abstracts from the object
  Object.entries(abstractData).forEach(([key, value]) => {
    // Check if key looks like a language code (2-3 lowercase letters)
    const isLanguageCode = /^[a-z]{2,3}(-[A-Z]{2})?$/.test(key);

    if (isLanguageCode && typeof value === 'string' && value.trim()) {
      // Accept any language code from the API, not just availableLanguages
      abstracts.push({ lang: key, content: value });
    } else if (typeof value === 'string' && value.trim()) {
      // Handle non-language keys (fallback to current language)
      abstracts.push({ lang: currentLanguage, content: value });
    }
  });

  // If no abstracts were extracted, return null
  if (abstracts.length === 0) {
    return null;
  }

  // If only one abstract, render it without language badge
  if (abstracts.length === 1) {
    const { lang, content } = abstracts[0];
    const direction = getTextDirection(lang);

    return (
      <div className="abstract-single" dir={direction}>
        <MathJax dynamic>{content}</MathJax>
      </div>
    );
  }

  // Render multiple abstracts with language badges
  return (
    <div className="abstract-multilingual">
      {abstracts.map(({ lang, content }, index) => {
        const direction = getTextDirection(lang);
        const languageLabel = getLanguageLabel(lang, currentLanguage);

        return (
          <div key={`${lang}-${index}`} className="language-group" dir={direction}>
            <div className="language-badge">{languageLabel}</div>
            <div className="abstract-content">
              <MathJax dynamic>{content}</MathJax>
            </div>
            {index < abstracts.length - 1 && <div className="language-separator" />}
          </div>
        );
      })}
    </div>
  );
}
