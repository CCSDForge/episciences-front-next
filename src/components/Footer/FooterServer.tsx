import { Link } from '@/components/Link/Link';
import { getServerTranslations, t, defaultLanguage } from '@/utils/server-i18n';
import './Footer.scss';

const logoEpisciences = '/logos/logo-episciences.svg';
const logoSmall = '/logos/logo-small.svg';

export default async function FooterServer(): Promise<JSX.Element> {
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'journal';
  const episciencesUrl = process.env.NEXT_PUBLIC_EPISCIENCES_URL || 'https://www.episciences.org';
  const docUrl = process.env.NEXT_PUBLIC_EPISCIENCES_DOCUMENTATION_PAGE || 'https://doc.episciences.org';
  const journalsUrl = `${episciencesUrl}/journals`;
  const partnersUrl = `${episciencesUrl}/partners`;
  const legalTermsUrl = `${episciencesUrl}/legal-terms`;
  const privacyUrl = `${episciencesUrl}/privacy-and-personal-data`;
  const termsOfUseUrl = `${episciencesUrl}/terms-of-use`;
  const contactEmail = `mailto:${rvcode}@episciences.org`;

  // Load translations for the default language
  const translations = await getServerTranslations(defaultLanguage);

  return (
    <footer className="footer">
      {/* Journal section */}
      <div className="footer-journal">
        <div className="footer-journal-logo">
          <Link href="/">
            <img src={logoSmall} alt="Journal logo" />
          </Link>
        </div>
        <div className="footer-journal-links">
          <div className="footer-journal-links-journal">
            <Link href="/articles">{t('pages.articles.title', translations)}</Link>
            <div className="footer-journal-links-journal-divider">|</div>
            <Link href="/volumes">{t('pages.volumes.title', translations)}</Link>
            <div className="footer-journal-links-journal-divider">|</div>
            <Link href="/news">{t('pages.news.title', translations)}</Link>
            <div className="footer-journal-links-journal-divider">|</div>
            <Link href="/about">{t('pages.about.title', translations)}</Link>
          </div>
          <div className="footer-journal-links-rss">
            <Link href={contactEmail}>{t('components.footer.links.contact', translations)}</Link>
            <div className="footer-journal-links-rss-divider">|</div>
            <Link href="/for-authors">{t('pages.forAuthors.title', translations)}</Link>
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
            <Link href={docUrl}>{t('components.footer.links.documentation', translations)}</Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link href={journalsUrl}>{t('components.footer.links.journals', translations) || 'Journals'}</Link>
            <div className="footer-episciences-links-documentation-divider">|</div>
            <Link href={partnersUrl}>{t('components.footer.links.acknowledgements', translations)}</Link>
          </div>
          <div className="footer-episciences-links-legal">
            <Link href={legalTermsUrl}>{t('components.footer.links.legalMentions', translations)}</Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link href={privacyUrl}>{t('components.footer.links.privacyStatement', translations)}</Link>
            <div className="footer-episciences-links-legal-divider">|</div>
            <Link href={termsOfUseUrl}>{t('components.footer.links.termsOfUse', translations)}</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}