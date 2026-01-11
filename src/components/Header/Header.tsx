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
  ArrowRightBlackIcon,
  ExternalLinkWhiteIcon,
} from '@/components/icons';
import './Header.scss';

import { PATHS } from '@/config/paths';
import { statisticsBlocksConfiguration } from '@/config/statistics';
import { menuConfig, getVisibleMenuItems, processMenuItemPath } from '@/config/menu';
import { useAppDispatch, useAppSelector } from '@/hooks/store';
import { setSearch } from '@/store/features/search/search.slice';
import { availableLanguages } from '@/utils/i18n';
import { VOLUME_TYPE } from '@/utils/volume';
import Button from '@/components/Button/Button';
import LanguageDropdown from '@/components/LanguageDropdown/LanguageDropdown';
import HeaderSearchInput from '@/components/SearchInput/HeaderSearchInput/HeaderSearchInput';
import HeaderDropdown from './HeaderDropdown';

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
  const [showDropdown, setShowDropdown] = useState({
    content: false,
    about: false,
    publish: false,
  });
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
    setShowDropdown({ content: false, about: false, publish: false });
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

  // Keyboard handler for burger menu
  const handleBurgerKeyDown = (event: React.KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setShowMobileMenu(!showMobileMenu);
    } else if (event.key === 'Escape') {
      event.preventDefault();
      setShowMobileMenu(false);
    }
  };

  const getSubmitManagerLink = (): string | null => {
    const managerUrl = process.env.NEXT_PUBLIC_EPISCIENCES_MANAGER;
    const code = currentJournal?.code || process.env.NEXT_PUBLIC_JOURNAL_RVCODE;

    if (!managerUrl) return null;
    return code ? `${managerUrl}/${code}` : managerUrl;
  };

  const submitManagerLink = getSubmitManagerLink();

  const getPostHeaderLinks = (): React.JSX.Element => {
    // Prepare visible menu items with dynamic path replacements
    const visibleContentItems = getVisibleMenuItems(menuConfig.dropdowns.content).map(item =>
      processMenuItemPath(item, {
        lastVolumeId: lastVolume?.id?.toString() || '',
      })
    );
    const visibleAboutItems = getVisibleMenuItems(menuConfig.dropdowns.about);
    const visiblePublishItems = getVisibleMenuItems(menuConfig.dropdowns.publish);
    const visibleStandaloneItems = getVisibleMenuItems(menuConfig.standalone);

    return (
      <>
        <div className="header-postheader-links">
          {/* CONTENT Dropdown */}
          <HeaderDropdown
            label={t('components.header.content')}
            items={visibleContentItems}
            isOpen={showDropdown.content}
            onToggle={opened => toggleDropdown('content', opened)}
            dropdownKey="content"
            className={`dropdown-large ${language === 'fr' ? 'dropdown-large-fr' : ''}`}
          />

          {/* ABOUT Dropdown */}
          <HeaderDropdown
            label={t('components.header.about')}
            items={visibleAboutItems}
            isOpen={showDropdown.about}
            onToggle={opened => toggleDropdown('about', opened)}
            dropdownKey="about"
          />

          {/* Standalone items (BOARDS) */}
          {visibleStandaloneItems.map(item => (
            <Link key={item.key} href={item.path}>
              {t(item.label)}
            </Link>
          ))}

          {/* PUBLISH Dropdown - NEW - After Boards */}
          {visiblePublishItems.length > 0 && (
            <HeaderDropdown
              label={t('components.header.publish')}
              items={visiblePublishItems}
              isOpen={showDropdown.publish}
              onToggle={opened => toggleDropdown('publish', opened)}
              dropdownKey="publish"
              className="dropdown-publish"
            />
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
    if (!showMobileMenu) return <></>;

    // Prepare visible menu items with dynamic path replacements
    const visibleContentItems = getVisibleMenuItems(menuConfig.dropdowns.content).map(item =>
      processMenuItemPath(item, {
        lastVolumeId: lastVolume?.id?.toString() || '',
      })
    );
    const visibleAboutItems = getVisibleMenuItems(menuConfig.dropdowns.about);
    const visiblePublishItems = getVisibleMenuItems(menuConfig.dropdowns.publish);
    const visibleStandaloneItems = getVisibleMenuItems(menuConfig.standalone);

    return (
      <div
        className={`header-postheader-burger-content ${showMobileMenu ? 'header-postheader-burger-content-displayed' : ''}`}
      >
        <div className="header-postheader-burger-content-links">
          {/* CONTENT Section */}
          <div className="header-postheader-burger-content-links-section header-postheader-burger-content-links-section-bordered">
            <div className="header-postheader-burger-content-links-section-links">
              <span className="header-postheader-burger-content-links-section-links-title">
                {t('components.header.content')}
              </span>
              {visibleContentItems.map(item => (
                <span key={item.key} onTouchEnd={() => router.push(item.path)}>
                  {t(item.label)}
                </span>
              ))}
            </div>
          </div>

          {/* ABOUT Section */}
          <div className="header-postheader-burger-content-links-section header-postheader-burger-content-links-section-bordered">
            <div className="header-postheader-burger-content-links-section-links">
              <span className="header-postheader-burger-content-links-section-links-title">
                {t('components.header.about')}
              </span>
              {visibleAboutItems.map(item => (
                <span key={item.key} onTouchEnd={() => router.push(item.path)}>
                  {t(item.label)}
                </span>
              ))}
            </div>
          </div>

          {/* Standalone items (BOARDS) */}
          {visibleStandaloneItems.length > 0 && (
            <div className="header-postheader-burger-content-links-section header-postheader-burger-content-links-section-bordered">
              <div className="header-postheader-burger-content-links-section-links">
                {visibleStandaloneItems.map(item => (
                  <span key={item.key} onTouchEnd={() => router.push(item.path)}>
                    {t(item.label)}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* PUBLISH Section - NEW - After Boards */}
          {visiblePublishItems.length > 0 && (
            <div className="header-postheader-burger-content-links-section">
              <div className="header-postheader-burger-content-links-section-links">
                <span className="header-postheader-burger-content-links-section-links-title">
                  {t('components.header.publish')}
                </span>
                {visiblePublishItems.map(item => (
                  <span key={item.key} onTouchEnd={() => router.push(item.path)}>
                    {t(item.label)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isReduced) {
    return (
      <header className="header header-reduced" role="banner">
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
        <nav className="header-postheader" ref={mobileMenuDropdownRef} aria-label="Main navigation">
          {isMobileOnly && (
            <div
              className="header-postheader-burger"
              onClick={(): void => setShowMobileMenu(!showMobileMenu)}
              onKeyDown={handleBurgerKeyDown}
              role="button"
              aria-label="Toggle mobile menu"
              aria-expanded={showMobileMenu}
              tabIndex={0}
            >
              <BurgerIcon size={24} className="header-postheader-burger-icon" ariaLabel="Menu" />
              {getPostHeaderBurgerLinks()}
            </div>
          )}
          {getPostHeaderLinks()}
        </nav>
      </header>
    );
  }

  return (
    <header className="header" role="banner">
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <Link href={getEpisciencesHomePageLink()} target="_blank" rel="noopener noreferrer">
            <LogoTextIcon size={200} ariaLabel="Episciences" />
          </Link>
        </div>
        <div className="header-preheader-links">
          <div className="header-preheader-links-access-mobile">
            <Link href={getJournalAccessLink()} target="_blank" rel="noopener noreferrer">
              <ArrowRightBlackIcon size={16} ariaLabel="Access journals" />
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
      <nav className="header-postheader" ref={mobileMenuDropdownRef} aria-label="Main navigation">
        {isMobileOnly && (
          <div
            className="header-postheader-burger"
            onClick={(): void => setShowMobileMenu(!showMobileMenu)}
            onKeyDown={handleBurgerKeyDown}
            role="button"
            aria-label="Toggle mobile menu"
            aria-expanded={showMobileMenu}
            tabIndex={0}
          >
            <BurgerIcon size={24} className="header-postheader-burger-icon" ariaLabel="Menu" />
            {getPostHeaderBurgerLinks()}
          </div>
        )}
        {getPostHeaderLinks()}
      </nav>
    </header>
  );
}
