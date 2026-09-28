export interface SunIconProps {
  readonly size?: number;
  readonly className?: string;
}

export default function SunIcon({ size = 20, className = '' }: SunIconProps): React.JSX.Element {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 20 20"
      fill="none"
      className={className}
      aria-hidden="true"
    >
      <circle cx="10" cy="10" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
        <path d="M10 1.5v2" />
        <path d="M10 16.5v2" />
        <path d="M3.5 3.5l1.4 1.4" />
        <path d="M15.1 15.1l1.4 1.4" />
        <path d="M1.5 10h2" />
        <path d="M16.5 10h2" />
        <path d="M3.5 16.5l1.4-1.4" />
        <path d="M15.1 4.9l1.4-1.4" />
      </g>
    </svg>
  );
}
