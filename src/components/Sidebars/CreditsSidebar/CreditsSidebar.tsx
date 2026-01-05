'use client';

import { Link } from '@/components/Link/Link';
import Image from 'next/image';
import { CaretUpGreyIcon, CaretDownGreyIcon } from '@/components/icons';
import './CreditsSidebar.scss';

export interface ICreditsHeader {
  id: string;
  value: string;
  opened: boolean;
  children: ICreditsHeader[];
}

interface ICreditsSidebarProps {
  headers: ICreditsHeader[];
  toggleHeaderCallback: (id: string) => void;
}

export default function CreditsSidebar({ headers, toggleHeaderCallback }: ICreditsSidebarProps): React.JSX.Element {
  return (
    <div className='creditsSidebar'>
      {headers.map((header, index) => (
        <div
          key={index}
          className='creditsSidebar-header'
        >
          <div className='creditsSidebar-header-title'>
            <Link href={`#${header.id}`}>
              <div className='creditsSidebar-header-title-text'>{header.value}</div>
            </Link>
            {header.children.length > 0 && (
              header.opened ? (
                <CaretUpGreyIcon size={16} className='creditsSidebar-header-title-caret' ariaLabel="Collapse section" onClick={(): void => toggleHeaderCallback(header.id)} />
              ) : (
                <CaretDownGreyIcon size={16} className='creditsSidebar-header-title-caret' ariaLabel="Expand section" onClick={(): void => toggleHeaderCallback(header.id)} />
              )
            )}
          </div>
          {header.opened && (
            <div className='creditsSidebar-header-subheaders'>
              {header.children.map((subheader, index) => (
                <Link key={index} href={`#${subheader.id}`}>
                  <div className='creditsSidebar-header-subheaders-subheader'>
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