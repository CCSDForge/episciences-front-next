'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import { useRouter, usePathname } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { isMobileOnly } from 'react-device-detect';
import {
  BurgerIcon,
  LogoTextIcon,
  ArrowRightBlueIcon,
  ExternalLinkWhiteIcon,
} from '@/components/icons';
import './Header.scss';

import { PATHS } from '@/config/paths';
import { statisticsBlocksConfiguration } from '@/config/statistics';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setSearch } from '@/store/features/search/search.slice';
import { availableLanguages } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import Button from '@/components/Button/Button';
import LanguageDropdown from '@/components/LanguageDropdown/LanguageDropdown';
import HeaderSearchInput from '@/components/SearchInput/HeaderSearchInput/HeaderSearchInput';

interface HeaderProps {
  currentJournal?: {
    id: number;
    code: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export default function Header({ currentJournal }: HeaderProps): React.JSX.Element {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();

  const reducedScrollPosition = 100;

  const search = useAppSelector(state => state.searchReducer.search);
  const language = useAppSelector(state => state.i18nReducer.language);
  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);
  const lastVolume = useAppSelector(state => state.volumeReducer.lastVolume);

  // Définir un titre par défaut pour le build statique
  const defaultJournalTitle =
    process.env.NEXT_PUBLIC_JOURNAL_NAME || '[Pre-Production] Journal Epijinfo';

  const [isSearching, setIsSearching] = useState(false);
  const [isReduced, setIsReduced] = useState(false);
  const [showDropdown, setShowDropdown] = useState({ content: false, about: false });
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const mobileMenuDropdownRef = useRef<HTMLDivElement | null>(null);

  const getLogoOfJournal = (size: 'small' | 'big'): string => {
    const code = currentJournal?.code || process.env.NEXT_PUBLIC_JOURNAL_RVCODE || 'epijinfo';
    return `/logos/logo-${code.toLowerCase()}-${size}.svg`;
  };

  useEffect(() => {
    const handleTouchOutside = (event: TouchEvent): void => {
      if (
        mobileMenuDropdownRef.current &&
        !mobileMenuDropdownRef.current.contains(event.target as Node)
      ) {
        setShowMobileMenu(false);
      }
    };

    document.addEventListener('touchstart', handleTouchOutside);

    return () => {
      document.removeEventListener('touchstart', handleTouchOutside);
    };
  }, [mobileMenuDropdownRef]);

  useEffect(() => {
    const handleScroll = () => {
      const position = window.scrollY;
      setIsReduced(position > reducedScrollPosition);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, [reducedScrollPosition]);

  useEffect(() => {
    setShowDropdown({ content: false, about: false });
  }, [pathname]);

  const toggleDropdown = (menu: string, opened: boolean): void => {
    setShowDropdown(prev => ({ ...prev, [menu]: opened }));
  };

  const updateSearch = (updatedSearch: string): void => {
    dispatch(setSearch(updatedSearch));
  };

  const submitSearch = (): void => {
    if (!search) {
      return;
    }

    setIsSearching(false);
    router.push(`${PATHS.search}?terms=${encodeURIComponent(search)}`);
  };

  const getEpisciencesHomePageLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_HOMEPAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_HOMEPAGE!;

  const getJournalAccessLink = (): string =>
    language === 'fr'
      ? process.env.NEXT_PUBLIC_EPISCIENCES_JOURNALS_PAGE_FR!
      : process.env.NEXT_PUBLIC_EPISCIENCES_JOURNALS_PAGE!;

  const isMobileReduced = (): boolean => isReduced && isMobileOnly;

  const shouldRenderStatistics: boolean = statisticsBlocksConfiguration().some(
    config => config.render
  );

  const shouldRenderMenuItem = (key: string): boolean => {
    const envValue = process.env[`NEXT_PUBLIC_JOURNAL_MENU_${key}_RENDER`];
    return envValue === undefined || envValue === 'true';
  };

  const getSubmitManagerLink = (): string | null => {
    const managerUrl = process.env.NEXT_PUBLIC_EPISCIENCES_MANAGER;
    const code = currentJournal?.code || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (!managerUrl) return null;
    return code ? `${managerUrl}/${code}` : managerUrl;
  };

  const submitManagerLink = getSubmitManagerLink();

  const getPostHeaderLinks = (): React.JSX.Element => {
    return (
      <>
        <div className="header-postheader-links">
          <div
            className="header-postheader-links-dropdown"
            onMouseEnter={(): void => toggleDropdown('content', true)}
            onMouseLeave={(): void => toggleDropdown('content', false)}
          >
            <div>
              <span>{t('components.header.content')}</span>
            </div>
            {showDropdown.content && (
              <div
                className="header-postheader-links-dropdown-content"
                onMouseLeave={(): void => toggleDropdown('content', false)}
              >
                <div
                  className={`header-postheader-links-dropdown-content-links header-postheader-links-dropdown-content-links-large ${language === 'fr' && 'header-postheader-links-dropdown-content-links-large-fr'}`}
                >
                  <Link href={PATHS.articles}>{t('components.header.links.articles')}</Link>
                  {shouldRenderMenuItem('ACCEPTED_ARTICLES') && (
                    <Link href={PATHS.articlesAccepted}>
                      {t('components.header.links.articlesAccepted')}
                    </Link>
                  )}
                  {shouldRenderMenuItem('VOLUMES') && (
                    <Link href={PATHS.volumes}>{t('components.header.links.volumes')}</Link>
                  )}
                  {shouldRenderMenuItem('LAST_VOLUME') && (
                    <Link href={`${PATHS.volumes}/${lastVolume?.id}`}>
                      {t('components.header.links.lastVolume')}
                    </Link>
                  )}
                  {shouldRenderMenuItem('SECTIONS') && (
                    <Link href={PATHS.sections}>{t('components.header.links.sections')}</Link>
                  )}
                  {shouldRenderMenuItem('SPECIAL_ISSUES') && (
                    <Link href={`${PATHS.volumes}?type=${VOLUME_TYPE.SPECIAL_ISSUE}`}>
                      {t('components.header.links.specialIssues')}
                    </Link>
                  )}
                  {shouldRenderMenuItem('VOLUME_TYPE_PROCEEDINGS') && (
                    <Link href={`${PATHS.volumes}?type=${VOLUME_TYPE.PROCEEDINGS}`}>
                      {t('components.header.links.proceedings')}
                    </Link>
                  )}
                  <Link href={PATHS.authors}>{t('components.header.links.authors')}</Link>
                </div>
              </div>
            )}
          </div>
          <div
            className="header-postheader-links-dropdown"
            onMouseEnter={(): void => toggleDropdown('about', true)}
            onMouseLeave={(): void => toggleDropdown('about', false)}
          >
            <div>
              <span>{t('components.header.about')}</span>
            </div>
            {showDropdown.about && (
              <div
                className="header-postheader-links-dropdown-content"
                onMouseLeave={(): void => toggleDropdown('about', false)}
              >
                <div className="header-postheader-links-dropdown-content-links">
                  <Link href={PATHS.about}>{t('components.header.links.about')}</Link>
                  {shouldRenderMenuItem('NEWS') && (
                    <Link href={PATHS.news}>{t('components.header.links.news')}</Link>
                  )}
                  {shouldRenderStatistics && (
                    <Link href={PATHS.statistics}>{t('components.header.links.statistics')}</Link>
                  )}
                </div>
              </div>
            )}
          </div>
          {shouldRenderMenuItem('BOARDS') && (
            <Link href={PATHS.boards}>{t('components.header.links.boards')}</Link>
          )}
          {shouldRenderMenuItem('FOR_AUTHORS') && (
            <Link href={PATHS.forAuthors}>{t('components.header.links.forAuthors')}</Link>
          )}
        </div>
        <div
          className={`header-postheader-search ${isReduced ? 'header-postheader-search-reduced' : ''}`}
        >
          <div className="header-postheader-search-delimiter"></div>
          <div className="header-postheader-search-search">
            <HeaderSearchInput
              value={search ?? ''}
              placeholder={t('components.header.searchPlaceholder')}
              isSearching={isSearching}
              setIsSearchingCallback={setIsSearching}
              onChangeCallback={updateSearch}
              onSubmitCallback={submitSearch}
            />
          </div>
          {isSearching ? (
            <div className="header-postheader-search-submit header-postheader-search-submit-search">
              <Button text={t('components.header.search')} onClickCallback={submitSearch} />
            </div>
          ) : (
            <div className="header-postheader-search-submit header-postheader-search-submit-article">
              {submitManagerLink && (
                <Link href={submitManagerLink} target="_blank" rel="noopener noreferrer">
                  <Button
                    text={t('components.header.submit')}
                    onClickCallback={(): void => {}}
                    IconComponent={ExternalLinkWhiteIcon}
                    iconSize={16}
                  />
                </Link>
              )}
            </div>
          )}
        </div>
      </>
    );
  };

  const getPostHeaderBurgerLinks = (): React.JSX.Element => {
    if (showMobileMenu) {
      return (
        <div
          className={`header-postheader-burger-content ${showMobileMenu ? 'header-postheader-burger-content-displayed' : ''}`}
        >
          <div className="header-postheader-burger-content-links">
            <div className="header-postheader-burger-content-links-section header-postheader-burger-content-links-section-bordered">
              <div className="header-postheader-burger-content-links-section-links">
                <span className="header-postheader-burger-content-links-section-links-title">
                  {t('components.header.content')}
                </span>
                <span onTouchEnd={(): void => router.push(PATHS.articles)}>
                  {t('components.header.links.articles')}
                </span>
                {shouldRenderMenuItem('ACCEPTED_ARTICLES') && (
                  <span onTouchEnd={(): void => router.push(PATHS.articlesAccepted)}>
                    {t('components.header.links.articlesAccepted')}
                  </span>
                )}
                {shouldRenderMenuItem('VOLUMES') && (
                  <span onTouchEnd={(): void => router.push(PATHS.volumes)}>
                    {t('components.header.links.volumes')}
                  </span>
                )}
                {shouldRenderMenuItem('LAST_VOLUME') && (
                  <span onTouchEnd={(): void => router.push(`${PATHS.volumes}/${lastVolume?.id}`)}>
                    {t('components.header.links.lastVolume')}
                  </span>
                )}
                {shouldRenderMenuItem('SECTIONS') && (
                  <span onTouchEnd={(): void => router.push(PATHS.sections)}>
                    {t('components.header.links.sections')}
                  </span>
                )}
                {shouldRenderMenuItem('SPECIAL_ISSUES') && (
                  <span
                    onTouchEnd={(): void =>
                      router.push(`${PATHS.volumes}?type=${VOLUME_TYPE.SPECIAL_ISSUE}`)
                    }
                  >
                    {t('components.header.links.specialIssues')}
                  </span>
                )}
                {shouldRenderMenuItem('VOLUME_TYPE_PROCEEDINGS') && (
                  <span
                    onTouchEnd={(): void =>
                      router.push(`${PATHS.volumes}?type=${VOLUME_TYPE.PROCEEDINGS}`)
                    }
                  >
                    {t('components.header.links.proceedings')}
                  </span>
                )}
                <span onTouchEnd={(): void => router.push(PATHS.authors)}>
                  {t('components.header.links.authors')}
                </span>
              </div>
            </div>
            <div className="header-postheader-burger-content-links-section header-postheader-burger-content-links-section-bordered">
              <div className="header-postheader-burger-content-links-section-links">
                <span className="header-postheader-burger-content-links-section-links-title">
                  {t('components.header.about')}
                </span>
                <span onTouchEnd={(): void => router.push(PATHS.about)}>
                  {t('components.header.links.about')}
                </span>
                {shouldRenderMenuItem('NEWS') && (
                  <span onTouchEnd={(): void => router.push(PATHS.news)}>
                    {t('components.header.links.news')}
                  </span>
                )}
                {shouldRenderStatistics && (
                  <span onTouchEnd={(): void => router.push(PATHS.statistics)}>
                    {t('components.header.links.statistics')}
                  </span>
                )}
              </div>
            </div>
            <div className="header-postheader-burger-content-links-section">
              <div className="header-postheader-burger-content-links-section-links">
                {shouldRenderMenuItem('BOARDS') && (
                  <span onTouchEnd={(): void => router.push(PATHS.boards)}>
                    {t('components.header.links.boards')}
                  </span>
                )}
                {shouldRenderMenuItem('FOR_AUTHORS') && (
                  <span onTouchEnd={(): void => router.push(PATHS.forAuthors)}>
                    {t('components.header.links.forAuthors')}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }
    return <></>;
  };

  if (isReduced) {
    return (
      <header className="header header-reduced">
        <div className="header-reduced-journal">
          <div className="header-reduced-journal-logo">
            <Link href={PATHS.home}>
              <Image
                src={getLogoOfJournal('small')}
                alt={currentJournal?.name || 'Journal logo'}
                width={150}
                height={50}
                priority
                unoptimized
              />
            </Link>
          </div>
          <div className="header-reduced-journal-blank"></div>
          {availableLanguages.length > 1 && (
            <div className="header-reduced-journal-dropdown">
              <LanguageDropdown withWhiteCaret={isMobileReduced()} />
            </div>
          )}
        </div>
        <div className="header-postheader" ref={mobileMenuDropdownRef}>
          {isMobileOnly && (
            <div
              className="header-postheader-burger"
              onClick={(): void => setShowMobileMenu(!showMobileMenu)}
            >
              <BurgerIcon size={24} className="header-postheader-burger-icon" ariaLabel="Menu" />
              {getPostHeaderBurgerLinks()}
            </div>
          )}
          {getPostHeaderLinks()}
        </div>
      </header>
    );
  }

  return (
    <header className="header">
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <Link href={getEpisciencesHomePageLink()} target="_blank" rel="noopener noreferrer">
            <LogoTextIcon size={200} ariaLabel="Episciences" />
          </Link>
        </div>
        <div className="header-preheader-links">
          <div className="header-preheader-links-access-mobile">
            <Link href={getJournalAccessLink()} target="_blank" rel="noopener noreferrer">
              <ArrowRightBlueIcon size={16} ariaLabel="Access journals" />
            </Link>
          </div>
          <Link
            href={getJournalAccessLink()}
            className="header-preheader-links-access"
            target="_blank"
            rel="noopener noreferrer"
          >
            {t('components.header.journal')}
          </Link>
          {availableLanguages.length > 1 && <LanguageDropdown />}
        </div>
      </div>
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href={PATHS.home}>
            <Image
              src={getLogoOfJournal('big')}
              alt={currentJournal?.name || 'Journal logo'}
              width={300}
              height={100}
              priority
              unoptimized
            />
          </Link>
        </div>
        <div className="header-journal-title">
          {journalName || currentJournal?.name || defaultJournalTitle}
        </div>
      </div>
      <div className="header-postheader" ref={mobileMenuDropdownRef}>
        {isMobileOnly && (
          <div
            className="header-postheader-burger"
            onClick={(): void => setShowMobileMenu(!showMobileMenu)}
          >
            <BurgerIcon size={24} className="header-postheader-burger-icon" ariaLabel="Menu" />
            {getPostHeaderBurgerLinks()}
          </div>
        )}
        {getPostHeaderLinks()}
      </div>
    </header>
  );
}
