'use client';

import { Link } from '@/components/Link/Link';

import caretUp from '../../../../public/icons/caret-up-grey.svg';
import caretDown from '../../../../public/icons/caret-down-grey.svg';
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

export default function AboutSidebar({ headers, toggleHeaderCallback }: IAboutSidebarProps): JSX.Element {
  return (
    <div className="aboutSidebar">
      {headers.map((header, index) => (
        <div
          key={index}
          className="aboutSidebar-header"
        >
          <div className="aboutSidebar-header-title">
            <Link href={`#${header.id}`}>
              <div className="aboutSidebar-header-title-text">{header.value}</div>
            </Link>
            {header.children.length > 0 && <img className="aboutSidebar-header-title-caret" src={header.opened ? caretUp : caretDown} alt={header.opened ? 'Caret up icon' : 'Caret down icon'} onClick={(): void => toggleHeaderCallback(header.id)} />}
          </div>
          {header.opened && (
            <div className="aboutSidebar-header-subheaders">
              {header.children.map((subheader, index) => (
                <Link key={index} href={`#${subheader.id}`}>
                  <div className="aboutSidebar-header-subheaders-subheader">
                    {subheader.value}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
} 