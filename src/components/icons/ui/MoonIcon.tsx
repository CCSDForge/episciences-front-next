export interface MoonIconProps {
  readonly size?: number;
  readonly className?: string;
}

export default function MoonIcon({ size = 20, className = '' }: MoonIconProps): React.JSX.Element {
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
      <path
        d="M17 12.5A7 7 0 1 1 7.5 3a5.5 5.5 0 0 0 9.5 9.5Z"
        fill="currentColor"
      />
    </svg>
  );
}
