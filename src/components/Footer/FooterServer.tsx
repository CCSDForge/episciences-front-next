import { Link } from '@/components/Link/Link';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getJournalByCode } from '@/services/journal';
import { PATHS } from '@/config/paths';
import './Footer.scss';

const logoEpisciences = '/logos/logo-episciences.svg';
const logoSmall = '/logos/logo-small.svg';

interface FooterServerProps {
  lang?: string;
  journalId?: string;
}

export default async function FooterServer({ lang = 'en', journalId }: FooterServerProps): Promise<JSX.Element> {
  const rvcode = journalId || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'journal';
  const apiEndpoint = process.env.NEXT_PUBLIC_API_ROOT_ENDPOINT || 'https://api.episciences.org/api';
  const episciencesUrl = process.env.NEXT_PUBLIC_EPISCIENCES_URL || 'https://www.episciences.org';

  // Fetch journal data
  let journal;
  try {
    if (rvcode) {
      journal = await getJournalByCode(rvcode);
    }
  } catch (error) {
    console.error(`Failed to fetch journal data for footer (${rvcode}):`, error);
  }

  // Extract journal-specific information
  const journalNotice = journal?.settings?.find((s: any) => s.setting === 'contactJournalNotice')?.value;
  const issn = journal?.settings?.find((s: any) => s.setting === 'ISSN')?.value;
  const contactEmail = `mailto:${rvcode}@episciences.org`;
  const rssUrl = `${apiEndpoint}/feed/rss/${rvcode}`;

  // Episciences links (language-aware)
  const docUrl = lang === 'fr'
    ? (process.env.NEXT_PUBLIC_EPISCIENCES_DOCUMENTATION_PAGE_FR || 'https://doc.episciences.org/fr')
    : (process.env.NEXT_PUBLIC_EPISCIENCES_DOCUMENTATION_PAGE || 'https://doc.episciences.org');
  const partnersUrl = lang === 'fr'
    ? `${episciencesUrl}/fr/partenaires`
    : `${episciencesUrl}/partners`;
  const legalTermsUrl = lang === 'fr'
    ? (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_TERMS_PAGE_FR || `${episciencesUrl}/fr/mentions-legales`)
    : (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_TERMS_PAGE || `${episciencesUrl}/legal-terms`);
  const privacyUrl = lang === 'fr'
    ? (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_STATEMENT_PAGE_FR || `${episciencesUrl}/fr/donnees-personnelles`)
    : (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_STATEMENT_PAGE || `${episciencesUrl}/privacy-and-personal-data`);
  const termsOfUseUrl = lang === 'fr'
    ? (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_TERMS_OF_USE_PAGE_FR || `${episciencesUrl}/fr/cgu`)
    : (process.env.NEXT_PUBLIC_EPISCIENCES_LEGAL_PRIVACY_TERMS_OF_USE_PAGE || `${episciencesUrl}/terms-of-use`);
  const publishingPolicyAnchor = lang === 'fr'
    ? `/${lang}${PATHS.about}#politiques-de-publication`
    : `/${lang}${PATHS.about}#publishing-policies`;

  // Load translations for the current language
  const translations = await getServerTranslations(lang);

  return (
    <footer className="footer">
      {/* Journal section */}
      <div className="footer-journal">
        <div className="footer-journal-logo">
          <Link href={`/${lang}`}>
            <img src={logoSmall} alt="Journal logo" />
          </Link>
        </div>
        <div className="footer-journal-links">
          <div className="footer-journal-links-journal">
            {journalNotice && (
              <>
                <Link href={journalNotice} prefetch={false} target="_blank" rel="noopener noreferrer">
                  {t('components.footer.links.notice', translations)}
                </Link>
                <div className="footer-journal-links-journal-divider">|</div>
              </>
            )}
            <Link href={contactEmail} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.contact', translations)}
            </Link>
            <div className="footer-journal-links-journal-divider">|</div>
            <Link href={`/${lang}/${PATHS.credits}`} prefetch={false}>
              {t('components.footer.links.credits', translations)}
            </Link>
          </div>
          <div className="footer-journal-links-rss">
            {issn && (
              <>
                <div>{`eISSN ${issn}`}</div>
                <div className="footer-journal-links-rss-divider">|</div>
              </>
            )}
            <Link href={rssUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.rss', translations)}
            </Link>
          </div>
        </div>
      </div>

      {/* Episciences section */}
      <div className="footer-episciences">
        <div className="footer-episciences-logo">
          <Link href={episciencesUrl}>
            <img src={logoEpisciences} alt="Episciences" />
          </Link>
        </div>
        <div className="footer-episciences-links">
          <div className="footer-episciences-links-documentation">
            <Link href={docUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.documentation', translations)}
            </Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link href={partnersUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.acknowledgements', translations)}
            </Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link href={publishingPolicyAnchor} prefetch={false}>
              {t('components.footer.links.publishingPolicy', translations)}
            </Link>
          </div>
          <div className="footer-episciences-links-legal">
            <Link href={legalTermsUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.legalMentions', translations)}
            </Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link href={privacyUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.privacyStatement', translations)}
            </Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link href={termsOfUseUrl} prefetch={false} target="_blank" rel="noopener noreferrer">
              {t('components.footer.links.termsOfUse', translations)}
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}