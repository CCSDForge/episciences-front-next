'use client';

import { Link } from '@/components/Link/Link';
import Image from 'next/image';
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
  return (
    <div className='forAuthorsSidebar'>
      {headers.map((header, index) => (
        <div
          key={index}
          className='forAuthorsSidebar-header'
        >
          <div className='forAuthorsSidebar-header-title'>
            <Link href={`#${header.id}`}>
              <div className='forAuthorsSidebar-header-title-text'>{header.value}</div>
            </Link>
            {header.children.length > 0 && <img className='forAuthorsSidebar-header-title-caret' src={header.opened ? '/icons/caret-up-grey.svg' : '/icons/caret-down-grey.svg'} alt={header.opened ? 'Caret up icon' : 'Caret down icon'} onClick={(): void => toggleHeaderCallback(header.id)} />}
          </div>
          {header.opened && (
            <div className='forAuthorsSidebar-header-subheaders'>
              {header.children.map((subheader, index) => (
                <Link key={index} href={`#${subheader.id}`}>
                  <div className='forAuthorsSidebar-header-subheaders-subheader'>
                    {subheader.value}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
} 