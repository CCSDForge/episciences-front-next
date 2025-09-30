import { Link } from '@/components/Link/Link';
import SearchBar from './SearchBar';
import LanguageDropdownWrapper from './LanguageDropdownWrapper';
import './Header.scss';

const logoEpisciences = '/icons/logo-text.svg';
const logoBig = '/logos/logo-big.svg';
const logoSmall = '/logos/logo-small.svg';

export default function HeaderServer(): JSX.Element {
  const journalName = process.env.NEXT_PUBLIC_JOURNAL_NAME || 'Journal';
  const rvcode = process.env.NEXT_PUBLIC_JOURNAL_RVCODE;
  const episciencesUrl = process.env.NEXT_PUBLIC_EPISCIENCES_URL || 'https://www.episciences.org';

  return (
    <header className="header">
      {/* Pre-header - visible only when not reduced */}
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <Link href={episciencesUrl}>
            <img src={logoEpisciences} alt="Episciences" />
          </Link>
        </div>
        <div className="header-preheader-links">
          <div className="header-preheader-links-left">
            <Link href={episciencesUrl}>Open Access Journals</Link>
          </div>
          <div className="header-preheader-links-right">
            <LanguageDropdownWrapper />
          </div>
        </div>
      </div>

      {/* Journal header - visible only when not reduced */}
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/">
            <img src={logoBig} alt="Journal logo" />
          </Link>
        </div>
        <div className="header-journal-title">{journalName}</div>
      </div>

      {/* Reduced journal header - visible only when reduced */}
      <div className="header-reduced-journal">
        <div className="header-reduced-journal-logo">
          <Link href="/">
            <img src={logoSmall} alt="Journal logo" />
          </Link>
        </div>
        <div className="header-reduced-journal-blank"></div>
        <div className="header-reduced-journal-dropdown">
          <LanguageDropdownWrapper />
        </div>
      </div>

      {/* Post-header navigation */}
      <div className="header-postheader">
        <div className="header-postheader-links">
          {/* Articles & Issues dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/articles">Articles & Issues</Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links header-postheader-links-dropdown-content-links-large-fr">
                <Link href="/articles">All articles</Link>
                <Link href="/articles-accepted">All accepted articles</Link>
                <Link href="/volumes">All volumes</Link>
                <Link href="/volumes">Last volume</Link>
                <Link href="/sections">Sections</Link>
                <Link href="/volumes">Special issues</Link>
                <Link href="/volumes">Proceedings</Link>
                <Link href="/authors">Authors</Link>
              </div>
            </div>
          </div>

          {/* About dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/about">About</Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links">
                <Link href="/about">The journal</Link>
                <Link href="/news">News</Link>
                <Link href="/statistics">Statistics</Link>
              </div>
            </div>
          </div>

          <Link href="/boards">Boards</Link>
          <Link href="/for-authors">For authors</Link>
        </div>

        {/* Search form */}
        <SearchBar />
      </div>
    </header>
  );
}