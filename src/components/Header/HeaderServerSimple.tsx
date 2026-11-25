import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import LogoSignIcon from '@/components/icons/brand/LogoSignIcon';
import './Header.scss';

interface HeaderServerSimpleProps {
  readonly lang?: string;
}

export default function HeaderServerSimple({
  lang = 'en',
}: HeaderServerSimpleProps): React.JSX.Element {
  return (
    <header className="header">
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <a href="https://www.episciences.org">
            <LogoSignIcon size={30} ariaLabel="Episciences" loading="lazy" />
          </a>
        </div>
      </div>
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/" lang={lang}>
            <Image
              src="/logos/logo-big.svg"
              alt="Journal logo"
              priority
              width={0}
              height={0}
              style={{ width: 'auto', height: 'auto' }}
              unoptimized
            />
          </Link>
        </div>
        <div className="header-journal-title">Journal</div>
      </div>
      <div className="header-postheader">
        <div className="header-postheader-links">
          <Link href="/articles" lang={lang}>
            Articles
          </Link>
          <Link href="/about" lang={lang}>
            About
          </Link>
          <Link href="/boards" lang={lang}>
            Boards
          </Link>
        </div>
      </div>
    </header>
  );
}
