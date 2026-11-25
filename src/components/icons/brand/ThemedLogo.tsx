/**
 * Themed Logo Component
 *
 * Renders a light-background and a dark-background variant of the same logo and
 * shows only the one matching the active colour scheme (explicit `data-theme` or
 * the OS preference under "system"), resolved in CSS (see ThemedLogo.scss).
 * A `<picture>` with a `prefers-color-scheme` media query can't be used because
 * it ignores the explicit theme toggle. The hidden variant is `display: none`,
 * so it is removed from the accessibility tree and only one alt text is announced.
 * Without CSS (reader mode, text browsers) both images show and the alt text is
 * announced twice: accepted trade-off, since an empty alt on the dark variant
 * would leave dark-mode screen-reader users without an accessible name.
 *
 * Both variants are loaded eagerly: browsers don't fetch a lazy image while it is
 * `display: none`, so the other variant would only start downloading on theme
 * toggle, leaving the logo slot empty meanwhile. The SVGs are small.
 *
 * Both files must share the same intrinsic aspect ratio so that swapping
 * variants on theme change causes no layout shift.
 */

import Image from 'next/image';
import './ThemedLogo.scss';

export interface ThemedLogoProps {
  readonly lightSrc: string;
  readonly darkSrc: string;
  readonly alt: string;
  readonly width: number;
  readonly height: number;
  readonly className?: string;
}

export default function ThemedLogo({
  lightSrc,
  darkSrc,
  alt,
  width,
  height,
  className = '',
}: ThemedLogoProps): React.JSX.Element {
  const extraClass = className ? ` ${className}` : '';

  return (
    <>
      <Image
        src={lightSrc}
        alt={alt}
        width={width}
        height={height}
        className={`themed-logo themed-logo--light${extraClass}`}
        loading="eager"
        unoptimized // SVG doesn't benefit from optimization
      />
      <Image
        src={darkSrc}
        alt={alt}
        width={width}
        height={height}
        className={`themed-logo themed-logo--dark${extraClass}`}
        loading="eager"
        unoptimized
      />
    </>
  );
}
