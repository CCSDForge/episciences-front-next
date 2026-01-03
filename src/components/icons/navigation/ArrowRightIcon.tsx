/**
 * Arrow Right Icon Component
 *
 * A reusable SVG icon component for displaying a rightward-pointing arrow with tail.
 * Commonly used for navigation, external links, and "next" actions.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface ArrowRightIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function ArrowRightIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: ArrowRightIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g transform="translate(0 0.098)">
        <path
          d="M12,.625l5.978,7.484L12,15.592"
          transform="translate(-3.033 -0.157)"
          fill="none"
          stroke={color}
          strokeMiterlimit="10"
          strokeWidth="2"
        />
        <line
          x1="14.945"
          transform="translate(0 7.951)"
          fill="none"
          stroke={color}
          strokeMiterlimit="10"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}

// Pre-configured color variants
export const ArrowRightBlueIcon = (props: Omit<ArrowRightIconProps, 'color'>) => (
  <ArrowRightIcon {...props} color="#2563EB" />
);

export const ArrowRightWhiteIcon = (props: Omit<ArrowRightIconProps, 'color'>) => (
  <ArrowRightIcon {...props} color="#FFFFFF" />
);

export const ArrowRightRedIcon = (props: Omit<ArrowRightIconProps, 'color'>) => (
  <ArrowRightIcon {...props} color="#C1002A" />
);

export const ArrowRightBlackIcon = (props: Omit<ArrowRightIconProps, 'color'>) => (
  <ArrowRightIcon {...props} color="#000000" />
);
