import { Link } from '@/components/Link/Link';
import './Header.scss';

interface HeaderServerSimpleProps {
  lang?: string;
}

export default function HeaderServerSimple({ lang = 'en' }: HeaderServerSimpleProps): React.JSX.Element {
  return (
    <header className="header">
      <div className="header-preheader">
        <div className="header-preheader-logo">
          <a href="https://www.episciences.org">
            <img src="/logos/logo-episciences.svg" alt="Episciences" />
          </a>
        </div>
      </div>
      <div className="header-journal">
        <div className="header-journal-logo">
          <Link href="/" lang={lang}>
            <img src="/logos/logo-big.svg" alt="Journal logo" />
          </Link>
        </div>
        <div className="header-journal-title">Journal</div>
      </div>
      <div className="header-postheader">
        <div className="header-postheader-links">
          <Link href="/articles" lang={lang}>Articles</Link>
          <Link href="/about" lang={lang}>About</Link>
          <Link href="/boards" lang={lang}>Boards</Link>
        </div>
      </div>
    </header>
  );
}