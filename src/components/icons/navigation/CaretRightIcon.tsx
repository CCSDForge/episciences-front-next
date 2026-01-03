/**
 * Caret Right Icon Component
 *
 * A reusable SVG icon component for displaying a rightward-pointing caret/arrow.
 * Implemented as a rotated CaretUpIcon to ensure visual consistency.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface CaretRightIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function CaretRightIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: CaretRightIconProps): JSX.Element {
  const height = (size * 7.5) / 13.632;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 13.632 7.5"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
      style={{ transform: 'rotate(90deg)' }}
    >
      <g transform="translate(0 7.5) rotate(-90)">
        <path
          d="M.781.625l4.95,6.059L.781,12.743"
          transform="translate(0.185 0.132)"
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
export const CaretRightRedIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#C1002A" />
);

export const CaretRightGreyIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#6B7280" />
);

export const CaretRightGreyLightIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#D1D5DB" />
);

export const CaretRightBlueIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#2563EB" />
);

export const CaretRightBlackIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#000000" />
);

export const CaretRightWhiteIcon = (props: Omit<CaretRightIconProps, 'color'>) => (
  <CaretRightIcon {...props} color="#FFFFFF" />
);
