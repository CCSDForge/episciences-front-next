/**
 * LinkedIn Icon Component
 *
 * A reusable SVG icon component for displaying the LinkedIn logo.
 * Commonly used for social sharing, social media links, and professional profiles.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface LinkedinIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function LinkedinIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: LinkedinIconProps): React.JSX.Element {
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
        d="M14.482,2.25H1.111A1.119,1.119,0,0,0,0,3.374V16.721a1.119,1.119,0,0,0,1.111,1.124H14.482A1.122,1.122,0,0,0,15.6,16.721V3.374A1.122,1.122,0,0,0,14.482,2.25ZM4.714,15.618H2.4V8.175H4.717v7.443ZM3.558,7.159A1.34,1.34,0,1,1,4.9,5.818a1.341,1.341,0,0,1-1.34,1.34Zm9.821,8.459H11.067V12c0-.863-.017-1.974-1.2-1.974-1.2,0-1.389.94-1.389,1.911v3.683H6.165V8.175H8.383V9.192h.031a2.435,2.435,0,0,1,2.19-1.2c2.339,0,2.775,1.542,2.775,3.547Z"
        transform="translate(0 -2.25)"
        fill={color}
      />
    </svg>
  );
}
