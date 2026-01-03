/**
 * External Link Icon Component
 *
 * A reusable SVG icon component for displaying an external link icon (arrow pointing out of box).
 * Commonly used for links that open in new tabs or navigate to external websites.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface ExternalLinkIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function ExternalLinkIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: ExternalLinkIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 13.187 13.187"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M0,0V13.187H13.187V9.89H11.539v1.648H1.648V1.648H3.3V0ZM6.594,0,9.066,2.473,4.945,6.594,6.594,8.242l4.121-4.121,2.473,2.473V0Z"
        fill={color}
      />
    </svg>
  );
}

// Pre-configured color variants
export const ExternalLinkRedIcon = (props: Omit<ExternalLinkIconProps, 'color'>) => (
  <ExternalLinkIcon {...props} color="#C1002A" />
);

export const ExternalLinkBlueIcon = (props: Omit<ExternalLinkIconProps, 'color'>) => (
  <ExternalLinkIcon {...props} color="#2563EB" />
);

export const ExternalLinkBlackIcon = (props: Omit<ExternalLinkIconProps, 'color'>) => (
  <ExternalLinkIcon {...props} color="#000000" />
);

export const ExternalLinkWhiteIcon = (props: Omit<ExternalLinkIconProps, 'color'>) => (
  <ExternalLinkIcon {...props} color="#FFFFFF" />
);
