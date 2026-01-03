/**
 * Search Icon Component
 *
 * A reusable SVG icon component for displaying a magnifying glass search icon.
 * Commonly used for search inputs, search buttons, and search features.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface SearchIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function SearchIcon({
  color = 'currentColor',
  size = 24,
  className = '',
  ariaLabel,
}: SearchIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24.444 24.444"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g>
        <circle
          cx="7.525"
          cy="7.525"
          r="7.525"
          transform="translate(1.505 1.505)"
          fill="none"
          stroke={color}
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          x1="8.867"
          y1="8.867"
          transform="translate(14.513 14.513)"
          fill="none"
          stroke={color}
          strokeMiterlimit="10"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
