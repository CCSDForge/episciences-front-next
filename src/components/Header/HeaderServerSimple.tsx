import Image from 'next/image';
import { Link } from '@/components/Link/Link';
import './Header.scss';

interface HeaderServerSimpleProps {
  lang?: string;
}

export default function HeaderServerSimple({
  lang = 'en',
}: HeaderServerSimpleProps): React.JSX.Element {
  return (
    <header className="header">
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <a href="https://www.episciences.org">
            <Image src="/logos/logo-episciences.svg" alt="Episciences" width={120} height={30} loading="lazy" unoptimized />
          </a>
        </div>
      </div>
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/" lang={lang}>
            <Image src="/logos/logo-big.svg" alt="Journal logo" priority width={160} height={160} sizes="160px" unoptimized />
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
