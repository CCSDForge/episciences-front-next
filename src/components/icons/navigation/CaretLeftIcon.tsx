/**
 * Caret Left Icon Component
 *
 * A reusable SVG icon component for displaying a leftward-pointing caret/arrow.
 * Implemented as a rotated CaretUpIcon to ensure visual consistency.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface CaretLeftIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  onTouchStart?: () => void;
  onTouchEnd?: () => void;
  onMouseDown?: () => void;
  onMouseUp?: () => void;
}

export default function CaretLeftIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
  onClick,
  onMouseEnter,
  onMouseLeave,
  onTouchStart,
  onTouchEnd,
  onMouseDown,
  onMouseUp,
}: CaretLeftIconProps): React.JSX.Element {
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
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      onMouseDown={onMouseDown}
      onMouseUp={onMouseUp}
      style={onClick ? { cursor: 'pointer', transform: 'rotate(-90deg)' } : { transform: 'rotate(-90deg)' }}
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
export const CaretLeftRedIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#C1002A" />
);

export const CaretLeftGreyIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#6B7280" />
);

export const CaretLeftGreyLightIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#D1D5DB" />
);

export const CaretLeftBlueIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#2563EB" />
);

export const CaretLeftBlackIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#000000" />
);

export const CaretLeftWhiteIcon = (props: Omit<CaretLeftIconProps, 'color'>) => (
  <CaretLeftIcon {...props} color="#FFFFFF" />
);
