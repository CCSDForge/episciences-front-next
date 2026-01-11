/**
 * List Icon Component
 *
 * A reusable SVG icon component for displaying a list view icon (horizontal lines).
 * Commonly used for view switchers, menu toggles, and layout options.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height auto-calculated)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface ListIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function ListIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: ListIconProps): React.JSX.Element {
  const height = (size * 15.5) / 15;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 15 15.5"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <rect width="15" height="3.5" transform="translate(0 12)" fill={color} />
      <rect width="15" height="3.5" transform="translate(0 6)" fill={color} />
      <rect width="15" height="3.5" fill={color} />
    </svg>
  );
}

// Pre-configured color variants
export const ListGreyIcon = (props: Omit<ListIconProps, 'color'>) => (
  <ListIcon {...props} color="#7d7d8e" />
);

export const ListRedIcon = (props: Omit<ListIconProps, 'color'>) => (
  <ListIcon {...props} color="#C1002A" />
);

export const ListBlackIcon = (props: Omit<ListIconProps, 'color'>) => (
  <ListIcon {...props} color="#000000" />
);
