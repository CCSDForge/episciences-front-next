/**
 * Tag Icon Component
 *
 * A reusable SVG icon component for displaying a tag/label icon.
 * Commonly used for categorization, keywords, and metadata display.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface TagIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function TagIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: TagIconProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 14 14"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g clipPath="url(#clip-path)">
        <path
          d="M13.541,6.683,7.262.4A1.387,1.387,0,0,0,6.279,0H1.4A1.4,1.4,0,0,0,0,1.4V6.279a1.392,1.392,0,0,0,.412.991L6.69,13.548a1.387,1.387,0,0,0,.984.4,1.364,1.364,0,0,0,.984-.412l4.883-4.883a1.364,1.364,0,0,0,.412-.984,1.409,1.409,0,0,0-.412-.991m-11.1-3.2A1.046,1.046,0,1,1,3.488,2.442,1.045,1.045,0,0,1,2.442,3.488"
          fill={color}
        />
      </g>
      <defs>
        <clipPath id="clip-path">
          <rect width="14" height="14" fill={color} />
        </clipPath>
      </defs>
    </svg>
  );
}
