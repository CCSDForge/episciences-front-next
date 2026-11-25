/**
 * Logo Text Icon Component (Episciences Logo with Text)
 *
 * Theme-aware Episciences logotype:
 * - `/icons/logo-text.svg`: drawn for light backgrounds (dark navy "EPI")
 * - `/icons/logo-text-dark.svg`: official dark-background logotype (white "EPI")
 *
 * @param size - Icon width in pixels
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 * @param loading - Native image loading strategy
 */

import ThemedLogo from './ThemedLogo';

export interface LogoTextIconProps {
  readonly size?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly loading?: 'lazy' | 'eager';
}

// Both SVG files share the same 156×45 intrinsic aspect ratio (width / height).
const ASPECT_RATIO = 156 / 45;

export default function LogoTextIcon({
  size = 200,
  className,
  ariaLabel,
  loading,
}: LogoTextIconProps): React.JSX.Element {
  return (
    <ThemedLogo
      lightSrc="/icons/logo-text.svg"
      darkSrc="/icons/logo-text-dark.svg"
      alt={ariaLabel || 'Episciences logo'}
      width={size}
      height={Math.round(size / ASPECT_RATIO)}
      className={className}
      loading={loading}
    />
  );
}
