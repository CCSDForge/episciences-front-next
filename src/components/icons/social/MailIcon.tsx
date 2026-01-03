/**
 * Mail/Email Icon Component
 *
 * A reusable SVG icon component for displaying an email/mail icon.
 * Commonly used for contact links, email sharing, and messaging features.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface MailIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function MailIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: MailIconProps): JSX.Element {
  const height = (size * 13.431) / 16.881;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 16.881 13.431"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <g transform="translate(1.393 1)">
        <path
          d="M4.41,6H15.686A1.423,1.423,0,0,1,17.1,7.429V16a1.423,1.423,0,0,1-1.41,1.429H4.41A1.423,1.423,0,0,1,3,16V7.429A1.423,1.423,0,0,1,4.41,6Z"
          transform="translate(-3 -6)"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M17.1,9l-7.048,4.933L3,9"
          transform="translate(-3 -7.59)"
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
