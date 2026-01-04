'use client';

import { Link } from '@/components/Link/Link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import './ForAuthorsSidebar.scss';

export interface IForAuthorsHeader {
  id: string;
  value: string;
  opened: boolean;
  children: IForAuthorsHeader[];
}

interface IForAuthorsSidebarProps {
  headers: IForAuthorsHeader[];
  toggleHeaderCallback: (id: string) => void;
}

export default function ForAuthorsSidebar({ headers, toggleHeaderCallback }: IForAuthorsSidebarProps): JSX.Element {
  const pathname = usePathname();
  
  const handleAnchorClick = (e: React.MouseEvent<HTMLAnchorElement>, anchorId: string) => {
    e.preventDefault();
    const element = document.getElementById(anchorId);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth',
        block: 'start' 
      });
      // Update URL without causing navigation
      window.history.pushState(null, '', `${pathname}#${anchorId}`);
    }
  };
  
  return (
    <div className='forAuthorsSidebar'>
      {headers.map((header, index) => (
        <div
          key={index}
          className='forAuthorsSidebar-header'
        >
          <div className='forAuthorsSidebar-header-title'>
            <a 
              href={`${pathname}#${header.id}`}
              onClick={(e) => handleAnchorClick(e, header.id)}
              className='forAuthorsSidebar-header-title-link'
            >
              <div className='forAuthorsSidebar-header-title-text'>{header.value}</div>
            </a>
            {header.children.length > 0 && (
              header.opened ? (
                <CaretUpGreyIcon size={16} className='forAuthorsSidebar-header-title-caret' ariaLabel="Collapse section" onClick={(): void => toggleHeaderCallback(header.id)} />
              ) : (
                <CaretDownGreyIcon size={16} className='forAuthorsSidebar-header-title-caret' ariaLabel="Expand section" onClick={(): void => toggleHeaderCallback(header.id)} />
              )
            )}
          </div>
          {header.opened && (
            <div className='forAuthorsSidebar-header-subheaders'>
              {header.children.map((subheader, index) => (
                <a 
                  key={index} 
                  href={`${pathname}#${subheader.id}`}
                  onClick={(e) => handleAnchorClick(e, subheader.id)}
                  className='forAuthorsSidebar-header-subheaders-subheader-link'
                >
                  <div className='forAuthorsSidebar-header-subheaders-subheader'>
                    {subheader.value}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 