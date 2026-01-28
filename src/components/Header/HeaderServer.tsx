import { Link } from '@/components/Link/Link';
import SearchBar from './SearchBar';
import LanguageDropdownWrapper from './LanguageDropdownWrapper';
import MobileBurgerMenu from './MobileBurgerMenu';
import SkipLink from '@/components/SkipLink/SkipLink';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { getJournalByCode } from '@/services/journal';
import { menuConfig, getVisibleMenuItems, processMenuItemPath } from '@/config/menu';
import { fetchVolumes } from '@/services/volume';
import { getPublicJournalConfig } from '@/utils/env-loader';
import fs from 'fs';
import path from 'path';
import './Header.scss';
import '@/components/SkipLink/SkipLink.scss';

const logoEpisciences = '/icons/logo-text.svg';
const logoBig = '/logos/logo-big.svg';
const logoSmall = '/logos/logo-small.svg';

interface HeaderServerProps {
  lang?: string;
  journalId?: string;
}

export default async function HeaderServer({
  lang = 'en',
  journalId,
}: HeaderServerProps): Promise<React.JSX.Element> {
  const episciencesUrl = process.env.NEXT_PUBLIC_EPISCIENCES_URL || 'https://www.episciences.org';

  // Fetch journal info to get the name and logo
  let journalName = 'Journal';
  let journalLogoFilename: string | undefined = undefined; // To store the journal's logo filename
  let lastVolumeId = '';
  const code = journalId || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

  // Load journal-specific public configuration (for multi-tenant support)
  const journalPublicConfig = code ? getPublicJournalConfig(code) : {};
  const episciencesManagerUrl = journalPublicConfig.NEXT_PUBLIC_EPISCIENCES_MANAGER;

  try {
    if (code) {
      const [journal, volumesData] = await Promise.all([
        getJournalByCode(code),
        fetchVolumes({
          rvcode: code,
          language: lang,
          page: 1,
          itemsPerPage: 1,
          types: [],
          years: [],
        }).catch(() => ({ data: [] })),
      ]);

      journalName =
        journal?.name || journal?.title?.[lang as keyof typeof journal.title] || 'Journal';
      journalLogoFilename = journal?.logo; // Get the logo filename if available

      if (volumesData?.data?.[0]?.id) {
        lastVolumeId = volumesData.data[0].id.toString();
      }
    }
  } catch (error) {
    console.error('Failed to fetch journal in HeaderServer:', error);
  }

  // Construct the final logo URLs
  // Strategy:
  // 1. Check for logo-{code}-big.svg and logo-{code}-small.svg in public/logos
  // 2. If not found, use journal.logo from API
  // 3. Fallback to default episciences logo

  let mainLogoSrc = logoEpisciences;
  let reducedLogoSrc = logoEpisciences;

  if (code) {
    try {
      const publicLogosDir = path.join(process.cwd(), 'public/logos');
      const bigLogoName = `logo-${code}-big.svg`;
      const smallLogoName = `logo-${code}-small.svg`;

      const bigLogoPath = path.join(publicLogosDir, bigLogoName);
      const smallLogoPath = path.join(publicLogosDir, smallLogoName);

      // Check if files exist (synchronous check is fine in Server Component)
      const hasBig = fs.existsSync(bigLogoPath);
      const hasSmall = fs.existsSync(smallLogoPath);

      if (hasBig) {
        mainLogoSrc = `/logos/${bigLogoName}`;
      } else if (journalLogoFilename) {
        mainLogoSrc = `/logos/${journalLogoFilename}`;
      }

      if (hasSmall) {
        reducedLogoSrc = `/logos/${smallLogoName}`;
      } else if (journalLogoFilename) {
        reducedLogoSrc = `/logos/${journalLogoFilename}`;
      }
    } catch (e) {
      console.warn('Error checking logo files:', e);
      // Fallback to API logo if fs check fails
      if (journalLogoFilename) {
        mainLogoSrc = `/logos/${journalLogoFilename}`;
        reducedLogoSrc = `/logos/${journalLogoFilename}`;
      }
    }
  }

  // Compute sign-in link URL (same as Submit button)
  const signInUrl =
    episciencesManagerUrl && code
      ? `${episciencesManagerUrl}/${code}`
      : episciencesManagerUrl || null;

  // Determine if multiple languages are available (for separator rendering)
  const acceptedLanguagesStr =
    journalPublicConfig?.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES ||
    process.env.NEXT_PUBLIC_JOURNAL_ACCEPTED_LANGUAGES ||
    '';
  const acceptedLanguages = acceptedLanguagesStr
    ? acceptedLanguagesStr.split(',').map((l: string) => l.trim()).filter(Boolean)
    : ['en', 'fr'];
  const hasMultipleLanguages = acceptedLanguages.length > 1;

  // Load translations for the current language
  const translations = await getServerTranslations(lang);

  // Prepare visible menu items with dynamic path replacements
  const visibleContentItems = getVisibleMenuItems(menuConfig.dropdowns.content).map(item =>
    processMenuItemPath(item, { lastVolumeId })
  );
  const visibleAboutItems = getVisibleMenuItems(menuConfig.dropdowns.about);
  const visiblePublishItems = getVisibleMenuItems(menuConfig.dropdowns.publish);
  const visibleStandaloneItems = getVisibleMenuItems(menuConfig.standalone);

  return (
    <header className="header" role="banner">
      {/* Skip Links - Only visible on keyboard focus (WCAG 2.4.1) */}
      <SkipLink href="#main-content">
        {t('components.header.skipToMain', translations)}
      </SkipLink>
      <SkipLink href="#search-bar">
        {t('components.header.skipToSearch', translations)}
      </SkipLink>

      {/* Pre-header - visible only when not reduced */}
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <Link href={episciencesUrl} lang={lang}>
            <img src={logoEpisciences} alt="Episciences" loading="lazy" />
          </Link>
        </div>
        <div className="header-preheader-links">
          <Link
            href={episciencesUrl}
            className="header-preheader-links-access"
            lang={lang}
          >
            {t('components.header.links.openAccessJournals', translations)}
          </Link>
          <div className="header-preheader-links-right">
            <LanguageDropdownWrapper lang={lang} />
            {signInUrl && (
              <>
                {hasMultipleLanguages && (
                  <span className="header-signin-separator" aria-hidden="true">|</span>
                )}
                <Link
                  href={signInUrl}
                  lang={lang}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="header-signin"
                >
                  <span className="header-signin-text">
                    {t('components.header.signIn', translations)}
                  </span>
                  <img
                    className="header-signin-icon"
                    src="/icons/user-circle.svg"
                    alt={t('components.header.signIn', translations)}
                    width={28}
                    height={28}
                  />
                  <span className="sr-only">
                    {t('components.header.newWindow', translations)}
                  </span>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Journal header - visible only when not reduced */}
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/" lang={lang}>
            <img src={mainLogoSrc} alt="Journal logo" loading="eager" />
          </Link>
        </div>
        <div className="header-journal-title">{journalName}</div>
      </div>

      {/* Reduced journal header - visible only when reduced */}
      <div className="header-reduced-journal">
        <div className="header-reduced-journal-logo">
          <Link href="/" lang={lang}>
            <img src={reducedLogoSrc} alt="Journal logo" loading="lazy" />
          </Link>
        </div>
        <div className="header-reduced-journal-blank">{journalName}</div>
        <div className="header-reduced-journal-dropdown">
          <LanguageDropdownWrapper lang={lang} />
          {signInUrl && (
            <>
              {hasMultipleLanguages && (
                <span className="header-signin-separator" aria-hidden="true">|</span>
              )}
              <Link
                href={signInUrl}
                lang={lang}
                target="_blank"
                rel="noopener noreferrer"
                className="header-signin"
              >
                <span className="header-signin-text">
                  {t('components.header.signIn', translations)}
                </span>
                <img
                  className="header-signin-icon"
                  src="/icons/user-circle.svg"
                  alt={t('components.header.signIn', translations)}
                  width={28}
                  height={28}
                />
                <span className="sr-only">
                  {t('components.header.newWindow', translations)}
                </span>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Post-header navigation */}
      <nav className="header-postheader" aria-label="Main navigation">
        {/* Burger menu - visible only on mobile via CSS */}
        <MobileBurgerMenu
          lang={lang}
          sections={[
            ...(visibleContentItems.length > 0
              ? [{
                  title: t('components.header.content', translations),
                  items: visibleContentItems.map(item => ({
                    key: item.key,
                    label: t(item.label, translations),
                    path: item.path,
                  })),
                }]
              : []),
            ...(visibleAboutItems.length > 0
              ? [{
                  title: t('components.header.about', translations),
                  items: visibleAboutItems.map(item => ({
                    key: item.key,
                    label: t(item.label, translations),
                    path: item.path,
                  })),
                }]
              : []),
            ...(visibleStandaloneItems.length > 0
              ? [{
                  items: visibleStandaloneItems.map(item => ({
                    key: item.key,
                    label: t(item.label, translations),
                    path: item.path,
                  })),
                }]
              : []),
            ...(visiblePublishItems.length > 0
              ? [{
                  title: t('components.header.publish', translations),
                  items: visiblePublishItems.map(item => ({
                    key: item.key,
                    label: t(item.label, translations),
                    path: item.path,
                  })),
                }]
              : []),
          ]}
        />
        <div className="header-postheader-links">
          {/* CONTENT Dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/articles" lang={lang}>
              {t('components.header.content', translations)}
            </Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links header-postheader-links-dropdown-content-links-large-fr">
                {visibleContentItems.map(item => (
                  <Link key={item.key} href={item.path} lang={lang}>
                    {t(item.label, translations)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* ABOUT Dropdown */}
          <div className="header-postheader-links-dropdown">
            <Link href="/about" lang={lang}>
              {t('components.header.about', translations)}
            </Link>
            <div className="header-postheader-links-dropdown-content">
              <div className="header-postheader-links-dropdown-content-links">
                {visibleAboutItems.map(item => (
                  <Link key={item.key} href={item.path} lang={lang}>
                    {t(item.label, translations)}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Standalone items (BOARDS) */}
          {visibleStandaloneItems.map(item => (
            <Link key={item.key} href={item.path} lang={lang}>
              {t(item.label, translations)}
            </Link>
          ))}

          {/* PUBLISH Dropdown - NEW - After Boards */}
          {visiblePublishItems.length > 0 && (
            <div className="header-postheader-links-dropdown">
              <Link href="/for-authors" lang={lang}>
                {t('components.header.publish', translations)}
              </Link>
              <div className="header-postheader-links-dropdown-content">
                <div className="header-postheader-links-dropdown-content-links header-postheader-links-dropdown-content-links-publish">
                  {visiblePublishItems.map(item => (
                    <Link key={item.key} href={item.path} lang={lang}>
                      {t(item.label, translations)}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Search form */}
        <SearchBar lang={lang} episciencesManagerUrl={episciencesManagerUrl} journalCode={code} />
      </nav>
    </header>
  );
}
