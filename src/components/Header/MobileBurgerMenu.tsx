'use client';

import { useState, useRef, useEffect } from 'react';
import { BurgerIcon } from '@/components/icons';
import { Link } from '@/components/Link/Link';

interface BurgerMenuItem {
  key: string;
  label: string;
  path: string;
}

interface BurgerMenuSection {
  title?: string;
  items: BurgerMenuItem[];
}

interface MobileBurgerMenuProps {
  sections: BurgerMenuSection[];
  lang: string;
}

export default function MobileBurgerMenu({ sections, lang }: MobileBurgerMenuProps) {
  const [showMenu, setShowMenu] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setShowMenu(false);
      }
    };

    document.addEventListener('touchstart', handleOutside);
    document.addEventListener('mousedown', handleOutside);

    return () => {
      document.removeEventListener('touchstart', handleOutside);
      document.removeEventListener('mousedown', handleOutside);
    };
  }, []);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      setShowMenu(prev => !prev);
    } else if (event.key === 'Escape') {
      setShowMenu(false);
    }
  };

  return (
    <div
      className="header-postheader-burger"
      ref={ref}
      onClick={() => setShowMenu(prev => !prev)}
      onKeyDown={handleKeyDown}
      role="button"
      aria-label="Toggle mobile menu"
      aria-expanded={showMenu}
      tabIndex={0}
    >
      <BurgerIcon size={24} className="header-postheader-burger-icon" ariaLabel="Menu" />
      {showMenu && (
        <div className="header-postheader-burger-content header-postheader-burger-content-displayed">
          <div className="header-postheader-burger-content-links">
            {sections.map((section, i) => (
              <div
                key={i}
                className={`header-postheader-burger-content-links-section${i < sections.length - 1 ? ' header-postheader-burger-content-links-section-bordered' : ''}`}
              >
                <div className="header-postheader-burger-content-links-section-links">
                  {section.title && (
                    <span className="header-postheader-burger-content-links-section-links-title">
                      {section.title}
                    </span>
                  )}
                  {section.items.map(item => (
                    <Link key={item.key} href={item.path} lang={lang}>
                      {item.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
