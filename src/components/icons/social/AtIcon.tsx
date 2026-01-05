/**
 * At (@) Icon Component
 *
 * A reusable SVG icon component for displaying an at symbol / email icon.
 * Commonly used for email addresses, mentions, and contact information.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface AtIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function AtIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: AtIconProps): React.JSX.Element {
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
        d="M9.8,2a7.8,7.8,0,0,0,0,15.6h3.9v-1.56H9.8A6.318,6.318,0,0,1,3.56,9.8,6.318,6.318,0,0,1,9.8,3.56,6.318,6.318,0,0,1,16.036,9.8v1.115a1.26,1.26,0,0,1-1.17,1.224,1.26,1.26,0,0,1-1.17-1.224V9.8a3.9,3.9,0,1,0-1.139,2.753A2.888,2.888,0,0,0,14.867,13.7,2.739,2.739,0,0,0,17.6,10.913V9.8A7.8,7.8,0,0,0,9.8,2Zm0,10.137A2.339,2.339,0,1,1,12.137,9.8,2.336,2.336,0,0,1,9.8,12.137Z"
        transform="translate(-2 -2)"
        fill={color}
      />
    </svg>
  );
}
