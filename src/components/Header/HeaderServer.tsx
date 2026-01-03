import { Link } from '@/components/Link/Link';
import SearchBar from './SearchBar';
import LanguageDropdownWrapper from './LanguageDropdownWrapper';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getJournalByCode } from '@/services/journal';
import './Header.scss';

const logoEpisciences = '/icons/logo-text.svg';
const logoBig = '/logos/logo-big.svg';
const logoSmall = '/logos/logo-small.svg';

interface HeaderServerProps {
  lang?: string;
  journalId?: string;
}

export default async function HeaderServer({ lang = 'en', journalId }: HeaderServerProps): Promise<JSX.Element> {
  const episciencesUrl = process.env.NEXT_PUBLIC_EPISCIENCES_URL || 'https://www.episciences.org';

  // Fetch journal info to get the name
  let journalName = 'Journal';
  try {
    // Si journalId est fourni, l'utiliser, sinon fallback (pour compatibilité)
    const code = journalId || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
    if (code) {
      const journal = await getJournalByCode(code);
      journalName = journal?.name || journal?.title?.[lang as keyof typeof journal.title] || 'Journal';
    }
  } catch (error) {
    console.error('Failed to fetch journal in HeaderServer:', error);
  }

  // Load translations for the current language
  const translations = await getServerTranslations(lang);

  return (
    <header className="header">
      {/* Pre-header - visible only when not reduced */}
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <Link href={episciencesUrl} lang={lang}>
            <img src={logoEpisciences} alt="Episciences" />
          </Link>
        </div>
        <div className="header-preheader-links">
          <div className="header-preheader-links-left">
            <Link href={episciencesUrl} lang={lang}>{t('components.header.links.openAccessJournals', translations)}</Link>
          </div>
          <div className="header-preheader-links-right">
            <LanguageDropdownWrapper lang={lang} />
          </div>
        </div>
      </div>

      {/* Journal header - visible only when not reduced */}
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/" lang={lang}>
            <img src={logoBig} alt="Journal logo" />
          </Link>
        </div>
        <div className="header-journal-title">{journalName}</div>
      </div>

      {/* Reduced journal header - visible only when reduced */}
      <div className="header-reduced-journal">
        <div className="header-reduced-journal-logo">
          <Link href="/" lang={lang}>
            <img src={logoSmall} alt="Journal logo" />
          </Link>
        </div>
        <div className="header-reduced-journal-blank">{journalName}</div>
        <div className="header-reduced-journal-dropdown">
          <LanguageDropdownWrapper lang={lang} />
        </div>
      </div>

      {/* Post-header navigation */}
      <div className="header-postheader">
        <div className="header-postheader-links">
          {/* Articles & Issues dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/articles" lang={lang}>{t('components.header.links.articlesAndIssues', translations)}</Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links header-postheader-links-dropdown-content-links-large-fr">
                <Link href="/articles" lang={lang}>{t('components.header.links.allArticles', translations)}</Link>
                <Link href="/articles-accepted" lang={lang}>{t('components.header.links.allAcceptedArticles', translations)}</Link>
                <Link href="/volumes" lang={lang}>{t('components.header.links.allVolumes', translations)}</Link>
                <Link href="/volumes" lang={lang}>{t('components.header.links.lastVolume', translations)}</Link>
                <Link href="/sections" lang={lang}>{t('components.header.links.sections', translations)}</Link>
                <Link href="/volumes" lang={lang}>{t('components.header.links.specialIssues', translations)}</Link>
                <Link href="/volumes" lang={lang}>{t('components.header.links.proceedings', translations)}</Link>
                <Link href="/authors" lang={lang}>{t('components.header.links.authors', translations)}</Link>
              </div>
            </div>
          </div>

          {/* About dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/about" lang={lang}>{t('components.header.links.about', translations)}</Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links">
                <Link href="/about" lang={lang}>{t('components.header.links.theJournal', translations)}</Link>
                <Link href="/news" lang={lang}>{t('components.header.links.news', translations)}</Link>
                <Link href="/statistics" lang={lang}>{t('components.header.links.statistics', translations)}</Link>
              </div>
            </div>
          </div>

          <Link href="/boards" lang={lang}>{t('components.header.links.boards', translations)}</Link>
          <Link href="/for-authors" lang={lang}>{t('components.header.links.forAuthors', translations)}</Link>
        </div>

        {/* Search form */}
        <SearchBar lang={lang} />
      </div>
    </header>
  );
}