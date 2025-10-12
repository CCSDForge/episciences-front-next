import { ReactNode } from 'react';
import { getLanguageFromParams, acceptedLanguages } from '@/utils/language-utils';
import HeaderServer from '@/components/Header/HeaderServer';
import HeaderClientWrapper from '@/components/Header/HeaderClientWrapper';
import FooterServer from '@/components/Footer/FooterServer';
import ToastContainerWrapper from '@/components/ToastContainerWrapper/ToastContainerWrapper';

interface LanguageLayoutProps {
  children: ReactNode;
  params: { lang: string };
}

/**
 * Layout for handling language-prefixed routes
 *
 * This layout extracts the language from the URL params and makes it available
 * to all child components. It validates that the language is accepted.
 *
 * URLs:
 * - Default language (EN): /en/about (redirected to /about by middleware)
 * - Other languages (FR): /fr/about
 */
export default async function LanguageLayout({ children, params }: LanguageLayoutProps) {
  // Extract and validate language from params
  const lang = getLanguageFromParams(params);

  return (
    <>
      <ToastContainerWrapper />
      {/* Header with scroll behavior */}
      <HeaderClientWrapper>
        <HeaderServer lang={lang} />
      </HeaderClientWrapper>
      {/* Server-rendered content - visible in static HTML */}
      <div className="main-content">
        {children}
      </div>
      <FooterServer lang={lang} />
    </>
  );
}

/**
 * Generate static params for all accepted languages
 *
 * This generates all languages including the default.
 * The middleware will handle redirecting /en/... to /... for the default language.
 */
export async function generateStaticParams() {
  return acceptedLanguages.map(lang => ({ lang }));
}
