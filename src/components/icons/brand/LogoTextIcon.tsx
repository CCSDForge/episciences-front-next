/**
 * Logo Text Icon Component (Episciences Logo with Text)
 *
 * A wrapper component for the complex Episciences logo SVG.
 * Uses Next.js Image component to load the SVG file efficiently.
 *
 * Note: The source SVG is very large (26K+ tokens), so this component
 * loads it as an external file for better performance and maintainability.
 *
 * @param size - Icon width in pixels
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

import Image from 'next/image';

export interface LogoTextIconProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function LogoTextIcon({
  size = 200,
  className = '',
  ariaLabel,
}: LogoTextIconProps): JSX.Element {
  return (
    <Image
      src="/icons/logo-text.svg"
      alt={ariaLabel || 'Episciences logo'}
      width={size}
      height={size * 0.4} // Approximate aspect ratio
      className={className}
      unoptimized // SVG doesn't benefit from optimization
    />
  );
}
