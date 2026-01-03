/**
 * Plus Circle Icon Component
 *
 * A reusable SVG icon component for displaying a plus sign in a circle.
 * Commonly used for adding items, expanding sections, and increment actions.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface PlusCircleIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function PlusCircleIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: PlusCircleIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      fill={color}
      viewBox="0 0 16 16"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
      <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4" />
    </svg>
  );
}
