/**
 * Mastodon Icon Component
 *
 * A reusable SVG icon component for displaying the Mastodon social media logo.
 * Commonly used for social sharing, social media links, and author profiles.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height auto-calculated)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface MastodonIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function MastodonIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: MastodonIconProps): React.JSX.Element {
  const height = (size * 15.582) / 14.536;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 14.536 15.582"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M17.206,7.116c0-3.381-2.215-4.371-2.215-4.371A13.824,13.824,0,0,0,9.965,2H9.916a13.822,13.822,0,0,0-5.025.745s-2.215.991-2.215,4.371c0,.774-.015,1.7.009,2.681.08,3.306.606,6.564,3.663,7.373a11.528,11.528,0,0,0,3.593.4,7.132,7.132,0,0,0,2.759-.63l-.058-1.282A9,9,0,0,1,9.96,16c-1.406-.048-2.888-.151-3.116-1.877a3.524,3.524,0,0,1-.031-.484,18.137,18.137,0,0,0,3.127.418,18.448,18.448,0,0,0,3.089-.184c1.952-.233,3.653-1.436,3.866-2.535A25.748,25.748,0,0,0,17.206,7.116Zm-2.612,4.355H12.973V7.5c0-.838-.352-1.262-1.057-1.262-.779,0-1.169.5-1.169,1.5V9.912H9.134V7.737c0-1-.39-1.5-1.17-1.5-.705,0-1.057.425-1.057,1.262v3.973H5.285V7.378a2.928,2.928,0,0,1,.641-1.993,2.224,2.224,0,0,1,1.736-.744A2.09,2.09,0,0,1,9.536,5.6l.4.677.4-.677a2.09,2.09,0,0,1,1.874-.957,2.225,2.225,0,0,1,1.736.744,2.931,2.931,0,0,1,.64,1.993Z"
        transform="translate(-2.671 -2)"
        fill={color}
      />
    </svg>
  );
}
