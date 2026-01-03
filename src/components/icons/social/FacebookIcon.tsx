/**
 * Facebook Icon Component
 *
 * A reusable SVG icon component for displaying the Facebook logo.
 * Commonly used for social sharing, social media links, and author profiles.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface FacebookIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function FacebookIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: FacebookIconProps): JSX.Element {
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
        d="M13.925,2.25H1.671A1.671,1.671,0,0,0,0,3.921V16.175a1.671,1.671,0,0,0,1.671,1.671H6.449v-5.3H4.256v-2.5H6.449v-1.9A3.046,3.046,0,0,1,9.71,4.787a13.287,13.287,0,0,1,1.933.168V7.079H10.554A1.248,1.248,0,0,0,9.147,8.427v1.621h2.394l-.383,2.5H9.147v5.3h4.778A1.671,1.671,0,0,0,15.6,16.175V3.921A1.671,1.671,0,0,0,13.925,2.25Z"
        transform="translate(0 -2.25)"
        fill={color}
      />
    </svg>
  );
}
