/**
 * Quote Icon Component
 *
 * A reusable SVG icon component for displaying quotation marks icon.
 * Commonly used for citations, article quotes, and reference copying.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface QuoteIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function QuoteIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: QuoteIconProps): JSX.Element {
  const height = (size * 12.228) / 13.187;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 13.187 12.228"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M5.942,19.228H8.768l1.884-4.891V7H5v7.337H7.826Zm7.535,0H16.3l1.884-4.891V7H12.535v7.337h2.826Z"
        transform="translate(-5 -7)"
        fill={color}
      />
    </svg>
  );
}

// Pre-configured color variants
export const QuoteRedIcon = (props: Omit<QuoteIconProps, 'color'>) => (
  <QuoteIcon {...props} color="#C1002A" />
);

export const QuoteBlackIcon = (props: Omit<QuoteIconProps, 'color'>) => (
  <QuoteIcon {...props} color="#000000" />
);
