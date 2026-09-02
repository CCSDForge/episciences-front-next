/**
 * Dataset Icon Component
 *
 * Generic icon used to represent a linked dataset hosted on an external repository
 * (Nakala, and any future repository provider). Deliberately provider-neutral: brand
 * logos (e.g. Nakala/Huma-Num's) require verifying usage rights before shipping them,
 * so this glyph is used until that is confirmed.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface DatasetIconProps {
  readonly color?: string;
  readonly size?: number;
  readonly className?: string;
  readonly ariaLabel?: string;
}

export default function DatasetIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: DatasetIconProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 16 16"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <ellipse cx="8" cy="3" rx="6" ry="2.2" fill="none" stroke={color} strokeWidth="1.2" />
      <path
        d="M2 3v4.5C2 8.7 4.7 9.7 8 9.7s6-1 6-2.2V3"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
      <path
        d="M2 7.5V12c0 1.2 2.7 2.2 6 2.2s6-1 6-2.2V7.5"
        fill="none"
        stroke={color}
        strokeWidth="1.2"
      />
    </svg>
  );
}
