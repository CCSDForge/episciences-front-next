import './Header.scss';

export default function HeaderServerSimple(): JSX.Element {
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
          <a href="/">
            <img src="/logos/logo-big.svg" alt="Journal logo" />
          </a>
        </div>
        <div className="header-journal-title">Journal</div>
      </div>
      <div className="header-postheader">
        <div className="header-postheader-links">
          <a href="/articles">Articles</a>
          <a href="/about">About</a>
          <a href="/boards">Boards</a>
        </div>
      </div>
    </header>
  );
}