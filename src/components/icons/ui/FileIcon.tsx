/**
 * File Icon Component
 *
 * A reusable SVG icon component for displaying a file/document icon.
 * Commonly used for article counts, document lists, and file attachments.
 *
 * @param color - CSS color value (default: 'currentColor')
 * @param size - Icon width in pixels (height is auto-calculated to maintain aspect ratio)
 * @param className - Additional CSS classes
 * @param ariaLabel - Accessible label for screen readers
 */

export interface FileIconProps {
  color?: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
}

export default function FileIcon({
  color = 'currentColor',
  size = 16,
  className = '',
  ariaLabel,
}: FileIconProps): React.JSX.Element {
  const height = (size * 15.567) / 12.6;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={height}
      viewBox="0 0 12.6 15.567"
      className={className}
      aria-label={ariaLabel}
      aria-hidden={!ariaLabel}
      role={ariaLabel ? 'img' : undefined}
    >
      <path
        d="M7.35,4.135V0H.787A.758.758,0,0,0,0,.73V14.838a.758.758,0,0,0,.787.73H11.812a.758.758,0,0,0,.787-.73V4.865H8.137A.763.763,0,0,1,7.35,4.135Zm5.02-.943L9.158.213A.82.82,0,0,0,8.6,0H8.4V3.892h4.2V3.706A.7.7,0,0,0,12.37,3.193Z"
        fill={color}
      />
    </svg>
  );
}

// Pre-configured color variants
export const FileGreyIcon = (props: Omit<FileIconProps, 'color'>) => (
  <FileIcon {...props} color="#7d7d8e" />
);

export const FileBlueIcon = (props: Omit<FileIconProps, 'color'>) => (
  <FileIcon {...props} color="#2563EB" />
);

export const FileBlackIcon = (props: Omit<FileIconProps, 'color'>) => (
  <FileIcon {...props} color="#000000" />
);
