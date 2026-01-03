/**
 * Twitter/X Icon Component
 *
 * A reusable SVG icon component for displaying the Twitter/X logo.
 * Commonly used for social sharing, social media links, and author profiles.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface TwitterIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function TwitterIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: TwitterIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 15.596 15.596"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M300.281,245.853l3.51,5.02h-1.44l-2.864-4.1h0l-.42-.6-3.346-4.786h1.44l2.7,3.862Z"
        transform="translate(-291.961 -238.322)"
        fill={color}
      />
      <path
        d="M13.911,0H1.685A1.685,1.685,0,0,0,0,1.685V13.911A1.685,1.685,0,0,0,1.685,15.6H13.911A1.685,1.685,0,0,0,15.6,13.911V1.685A1.685,1.685,0,0,0,13.911,0ZM9.948,13.226l-2.9-4.218L3.421,13.226H2.483L6.633,8.4l-4.15-6.04H5.648L8.393,6.356l3.436-3.994h.938l-3.957,4.6h0l4.3,6.263Z"
        fill={color}
      />
    </svg>
  );
}
