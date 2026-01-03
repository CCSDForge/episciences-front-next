import { ReactNode } from 'react';
import { getLanguageFromParams, acceptedLanguages } from '@/utils/language-utils';
import HeaderServer from '@/components/Header/HeaderServer';
import HeaderClientWrapper from '@/components/Header/HeaderClientWrapper';
import FooterServer from '@/components/Footer/FooterServer';
import ToastContainerWrapper from '@/components/ToastContainerWrapper/ToastContainerWrapper';

interface LanguageLayoutProps {
  children: ReactNode;
  params: { lang: string; journalId: string };
}

/**
 * Layout for handling language-prefixed routes in a multi-tenant setup
 */
export default async function LanguageLayout({ children, params }: LanguageLayoutProps) {
  // Extract and validate language from params
  const lang = getLanguageFromParams(params);
  const { journalId } = params;

  return (
    <>
      <ToastContainerWrapper />
      {/* Header with scroll behavior */}
      <HeaderClientWrapper>
        <HeaderServer lang={lang} journalId={journalId} />
      </HeaderClientWrapper>
      {/* Server-rendered content - visible in static HTML */}
      <div className="main-content">
        {children}
      </div>
      <FooterServer lang={lang} journalId={journalId} />
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
