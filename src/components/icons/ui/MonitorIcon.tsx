export interface MonitorIconProps {
  readonly size?: number;
  readonly className?: string;
}

export default function MonitorIcon({
  size = 20,
  className = '',
}: MonitorIconProps): React.JSX.Element {
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
      <g stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="16" height="11" rx="1.5" />
        <path d="M7 17.5h6" />
        <path d="M10 14v3.5" />
      </g>
    </svg>
  );
}
