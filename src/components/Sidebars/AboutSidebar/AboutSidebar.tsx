'use client';

import { CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import './AboutSidebar.scss';

export interface IAboutHeader {
  id: string;
  value: string;
  opened: boolean;
  children: IAboutHeader[];
}

interface IAboutSidebarProps {
  headers: IAboutHeader[];
  toggleHeaderCallback: (id: string) => void;
}

export default function AboutSidebar({
  headers,
  toggleHeaderCallback,
}: IAboutSidebarProps): React.JSX.Element {
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, id: string): void => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Update URL without navigation
      window.history.pushState(null, '', `#${id}`);
    }
  };

  return (
    <nav className="aboutSidebar" aria-label="Table of contents">
      {headers.map((header, index) => (
        <div key={index} className="aboutSidebar-header">
          <div className="aboutSidebar-header-title">
            <a href={`#${header.id}`} onClick={e => handleAnchorClick(e, header.id)}>
              <div className="aboutSidebar-header-title-text">{header.value}</div>
            </a>
            {header.children.length > 0 &&
              (header.opened ? (
                <CaretUpGreyIcon
                  size={16}
                  className="aboutSidebar-header-title-caret"
                  ariaLabel="Collapse section"
                  onClick={(): void => toggleHeaderCallback(header.id)}
                />
              ) : (
                <CaretDownGreyIcon
                  size={16}
                  className="aboutSidebar-header-title-caret"
                  ariaLabel="Expand section"
                  onClick={(): void => toggleHeaderCallback(header.id)}
                />
              ))}
          </div>
          {header.opened && (
            <div className="aboutSidebar-header-subheaders">
              {header.children.map((subheader, subIndex) => (
                <a
                  key={subIndex}
                  href={`#${subheader.id}`}
                  onClick={e => handleAnchorClick(e, subheader.id)}
                >
                  <div className="aboutSidebar-header-subheaders-subheader">{subheader.value}</div>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </nav>
  );
}
