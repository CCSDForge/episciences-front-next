/**
 * Burger Menu Icon Component
 *
 * A reusable SVG icon component for displaying a hamburger menu icon.
 * Commonly used for mobile navigation menus.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface BurgerIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function BurgerIcon({
  color = 'currentColor',
  size = 24,
  className = '',
  ariaLabel,
}: BurgerIconProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path d="M4 18L20 18" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 12L20 12" stroke={color} strokeWidth="2" strokeLinecap="round" />
      <path d="M4 6L20 6" stroke={color} strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
