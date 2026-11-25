/**
 * Logo Sign Icon Component (Episciences sign, without text)
 *
 * Theme-aware Episciences sign:
 * - `/logos/logo-episciences.svg`: drawn for light backgrounds
 * - `/logos/logo-episciences-dark.svg`: official dark-background sign
 *
 * @param size - Icon width and height in pixels (the sign is square)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 * @param loading - Native image loading strategy
 */

import ThemedLogo from './ThemedLogo';

export interface LogoSignIconProps {
  readonly size?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
  readonly loading?: 'lazy' | 'eager';
}

export default function LogoSignIcon({
  size = 30,
  className,
  ariaLabel,
  loading,
}: LogoSignIconProps): React.JSX.Element {
  return (
    <ThemedLogo
      lightSrc="/logos/logo-episciences.svg"
      darkSrc="/logos/logo-episciences-dark.svg"
      alt={ariaLabel || 'Episciences logo'}
      width={size}
      height={size}
      className={className}
      loading={loading}
    />
  );
}
