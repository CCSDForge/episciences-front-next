/**
 * Themed Logo Component
 *
 * Renders a light-background and a dark-background variant of the same logo and
 * shows only the one matching the active colour scheme (explicit `data-theme` or
 * the OS preference under "system"), resolved in CSS (see ThemedLogo.scss).
 * A `<picture>` with a `prefers-color-scheme` media query can't be used because
 * it ignores the explicit theme toggle. The hidden variant is `display: none`,
 * so it is removed from the accessibility tree and only one alt text is announced.
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
  readonly loading?: 'lazy' | 'eager';
}

export default function ThemedLogo({
  lightSrc,
  darkSrc,
  alt,
  width,
  height,
  className = '',
  loading,
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
        loading={loading}
        unoptimized // SVG doesn't benefit from optimization
      />
      <Image
        src={darkSrc}
        alt={alt}
        width={width}
        height={height}
        className={`themed-logo themed-logo--dark${extraClass}`}
        loading={loading}
        unoptimized
      />
    </>
  );
}
