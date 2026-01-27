# Changelog

## [Unreleased]

### Added
- **Sign-in link in header preheader bar**: Links to the Episciences manager (same URL as "Submit" button), opens in a new tab.
  - Desktop (>480px): Translated text ("Sign in" / "Connexion").
  - Mobile (≤480px): User-circle icon (28×28px) replaces text.
  - Appears in both full preheader and reduced (scrolled) header.
  - Pipe separator `|` between language switcher and sign-in link (only when multiple languages are available).
  - Accessible: `sr-only` "(new window)" label, `aria-hidden` separator, `alt` on mobile icon, focus-visible styles.
  - New SVG icon: `public/icons/user-circle.svg`.
  - New translation keys: `components.header.signIn`, `components.header.newWindow` (EN + FR).
