/**
 * Share Icon Component
 *
 * A reusable SVG icon component for displaying a share icon (three connected nodes).
 * Commonly used for social sharing, article sharing, and content distribution.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface ShareIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function ShareIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: ShareIconProps): JSX.Element {
  // Maintain original aspect ratio (13.23 / 14.656)
  const height = (size * 14.656) / 13.23;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 13.23 14.656"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g>
        <circle cx="2.629" cy="2.629" r="2.629" transform="translate(7.972)" fill={color} />
        <path
          d="M10.6,9.4a2.629,2.629,0,1,1-2.629,2.629A2.629,2.629,0,0,1,10.6,9.4"
          transform="translate(0 0)"
          fill={color}
        />
        <path
          d="M2.6,4.728A2.6,2.6,0,1,1,0,7.328a2.6,2.6,0,0,1,2.6-2.6"
          transform="translate(0 0)"
          fill={color}
        />
        <line
          y1="4.698"
          x2="8.001"
          transform="translate(2.6 2.63)"
          fill="none"
          stroke={color}
          strokeWidth="1"
        />
        <line
          x2="8.001"
          y2="4.7"
          transform="translate(2.6 7.328)"
          fill="none"
          stroke={color}
          strokeWidth="1"
        />
      </g>
    </svg>
  );
}
