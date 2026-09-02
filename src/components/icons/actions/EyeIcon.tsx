/**
 * Eye Icon Component
 *
 * Used for "preview" / "show" toggle actions.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface EyeIconProps {
  readonly color?: string;
  readonly size?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export default function EyeIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: EyeIconProps): React.JSX.Element {
  const height = (size * 10) / 16;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 16 10"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M8 0C4 0 1 2.5 0 5c1 2.5 4 5 8 5s7-2.5 8-5c-1-2.5-4-5-8-5Zm0 8.2A3.2 3.2 0 1 1 8 1.8a3.2 3.2 0 0 1 0 6.4Z"
        fill={color}
      />
      <circle cx="8" cy="5" r="1.6" fill={color} />
    </svg>
  );
}
