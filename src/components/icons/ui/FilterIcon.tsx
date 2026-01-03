/**
 * Filter Icon Component
 *
 * A reusable SVG icon component for displaying a filter/funnel icon.
 * Commonly used for filtering options, search refinement, and data sorting.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height auto-calculated)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface FilterIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function FilterIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: FilterIconProps): JSX.Element {
  const height = (size * 13.072) / 13;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 13 13.072"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M4.211,5.315c1.65,2.116,4.7,6.038,4.7,6.038v4.9a.819.819,0,0,0,.817.817H11.36a.819.819,0,0,0,.817-.817v-4.9s3.039-3.922,4.69-6.038A.815.815,0,0,0,16.222,4H4.857A.815.815,0,0,0,4.211,5.315Z"
        transform="translate(-4.038 -4)"
        fill={color}
      />
    </svg>
  );
}
