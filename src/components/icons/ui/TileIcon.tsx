/**
 * Tile Icon Component
 *
 * A reusable SVG icon component for displaying a tile/grid view icon.
 * Commonly used for view switchers between list and grid layouts.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon size in pixels (square icon)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface TileIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function TileIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: TileIconProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 15 15"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <rect width="7" height="7" fill={color} />
      <rect width="7" height="7" transform="translate(0 8)" fill={color} />
      <rect width="7" height="7" transform="translate(8)" fill={color} />
      <rect width="7" height="7" transform="translate(8 8)" fill={color} />
    </svg>
  );
}

// Pre-configured color variants
export const TileGreyIcon = (props: Omit<TileIconProps, 'color'>) => (
  <TileIcon {...props} color="#7d7d8e" />
);

export const TileRedIcon = (props: Omit<TileIconProps, 'color'>) => (
  <TileIcon {...props} color="#C1002A" />
);

export const TileBlackIcon = (props: Omit<TileIconProps, 'color'>) => (
  <TileIcon {...props} color="#000000" />
);
