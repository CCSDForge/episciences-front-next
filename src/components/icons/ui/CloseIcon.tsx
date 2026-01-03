/**
 * Close Icon Component
 *
 * A reusable SVG icon component for displaying a close/dismiss icon (X symbol).
 * Commonly used for closing modals, dismissing notifications, and canceling actions.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface CloseIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function CloseIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: CloseIconProps): JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 9.888 9.888"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M14.888,6l-1-1L9.944,8.948,6,5,5,6,8.948,9.944,5,13.892l1,1L9.944,10.94l3.948,3.948,1-1L10.94,9.944Z"
        transform="translate(-5 -5)"
        fill={color}
      />
    </svg>
  );
}

// Pre-configured color variants
export const CloseRedIcon = (props: Omit<CloseIconProps, 'color'>) => (
  <CloseIcon {...props} color="#C1002A" />
);

export const CloseBlackIcon = (props: Omit<CloseIconProps, 'color'>) => (
  <CloseIcon {...props} color="#000000" />
);
