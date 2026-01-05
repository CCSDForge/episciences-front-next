/**
 * ORCID Icon Component
 *
 * A wrapper component for the complex ORCID logo SVG.
 * Uses Next.js Image component to load the SVG file efficiently.
 *
 * Note: The source SVG is very large (49K+ tokens), so this component
 * loads it as an external file for better performance and maintainability.
 *
 * @param size - Icon width in pixels (height auto-calculated)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

import Image from 'next/image';

export interface OrcidIconProps {
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function OrcidIcon({
  size = 16,
  className = '',
  ariaLabel,
}: OrcidIconProps): React.JSX.Element {
  return (
    <Image
      src="/icons/orcid.svg"
      alt={ariaLabel || 'ORCID iD'}
      width={size}
      height={size} // Square icon
      className={className}
      unoptimized // SVG doesn't benefit from optimization
    />
  );
}
