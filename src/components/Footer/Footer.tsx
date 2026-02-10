'use client';

import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import { useTranslation } from 'react-i18next';
import { useAppSelector } from '@/hooks/store';
import { PATHS } from '@/config/paths';
import './Footer.scss';

export default function Footer(): React.JSX.Element {
  const { t } = useTranslation();

  const language = useAppSelector(state => state.i18nReducer.language);
  const currentJournal = useAppSelector(state => state.journalReducer.currentJournal);
  const enabled = useAppSelector(state => state.footerReducer.enabled);

  const getJournalNotice = (): string | undefined => {
    return currentJournal?.settings?.find(
      (setting: any) => setting.setting === 'contactJournalNotice'
    )?.value;
  };

  const getContact = (): string | undefined => {
    const code = currentJournal?.code;

    if (!code) return;

    return `mailto:${code}${process.env.NEXT_PUBLIC_EMAILS_SUFFIX}`;
  };

  const getISSN = (): string | undefined => {
    return currentJournal?.settings?.find((setting: any) => setting.setting === 'ISSN')?.value;
  };

  const getRSS = (): string | undefined => {
    const code = currentJournal?.code;

    if (!code) return;

    return `${process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT}/feed/rss/${code}`;
  };

  const getLogoOfJournal = (): string => {
    const code = currentJournal?.code;
    if (!code) return 'default';
    return `/logos/logo-${code}.svg`;
  };

  const getDocumentationLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_DOCUMENTATION_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_DOCUMENTATION_PAGE!;

  const getAcknowledgementsLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_ACKNOWLEDGEMENTS_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_ACKNOWLEDGEMENTS_PAGE!;

  const getLegalTermsLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_TERMS_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_TERMS_PAGE!;

  const getLegalPrivacyStatementLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_STATEMENT_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_STATEMENT_PAGE!;

  const getTermsOfUseLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_TERMS_OF_USE_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_TERMS_OF_USE_PAGE!;

  const getPublishingPolicyAnchor = (): string => {
    return language === 'fr'
      ? `/${PATHS.about.replace(/^\//, '')}#politiques-de-publication`
      : `/${PATHS.about.replace(/^\//, '')}#publishing-policies`;
  };

  return (
    <footer className={`footer ${!enabled && 'footer-disabled'}`}>
      <div className="footer-journal">
        <Image
          src={getLogoOfJournal()}
          alt={currentJournal?.name || 'Journal logo'}
          width={42}
          height={42}
          className="footer-journal-logo"
          unoptimized
        />
        <div className="footer-journal-links">
          <div className="footer-journal-links-journal">
            {getJournalNotice() && (
              <Link
                href={getJournalNotice()!}
                prefetch={false}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t('components.footer.links.notice')}
              </Link>
            )}
            <div className="footer-journal-links-journal-divider">|</div>
            {getContact() && (
              <Link href={getContact()!} prefetch={false} target="_blank" rel="noopener noreferrer">
                {t('components.footer.links.contact')}
              </Link>
            )}
            <div className="footer-journal-links-journal-divider">|</div>
            <Link href={PATHS.credits} prefetch={false}>
              {t('components.footer.links.credits')}
            </Link>
          </div>
          <div className="footer-journal-links-rss">
            {getISSN() && <div>{`eISSN ${getISSN()}`}</div>}
            {getISSN() && <div className="footer-journal-links-rss-divider">|</div>}
            {getRSS() && (
              <Link href={getRSS()!} prefetch={false} target="_blank" rel="noopener noreferrer">
                {t('components.footer.links.rss')}
              </Link>
            )}
          </div>
        </div>
      </div>
      <div className="footer-episciences">
        <Image
          src="/logo.svg"
          alt="Episciences"
          width={200}
          height={60}
          className="footer-episciences-logo"
          unoptimized
        />
        <div className="footer-episciences-links">
          <div className="footer-episciences-links-documentation">
            <Link
              href={getDocumentationLink()}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('components.footer.links.documentation')}
            </Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link
              href={getAcknowledgementsLink()}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('components.footer.links.acknowledgements')}
            </Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link href={getPublishingPolicyAnchor()} prefetch={false}>
              {t('components.footer.links.publishingPolicy')}
            </Link>
          </div>
          <div className="footer-episciences-links-legal">
            <Link href={`/${language}/accessibility`} prefetch={false}>
              {t('components.footer.links.accessibility')}
            </Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link
              href={getLegalTermsLink()}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('components.footer.links.legalMentions')}
            </Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link
              href={getLegalPrivacyStatementLink()}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('components.footer.links.privacyStatement')}
            </Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link
              href={getTermsOfUseLink()}
              prefetch={false}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('components.footer.links.termsOfUse')}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
