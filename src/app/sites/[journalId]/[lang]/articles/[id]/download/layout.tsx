import { ReactNode } from 'react';

interface DownloadLayoutProps {
  children: ReactNode;
}

/**
 * Layout for PDF download page - overrides parent layout to provide full-screen view
 * This layout removes the header and footer to allow the PDF viewer to take up the entire viewport
 */
export default function DownloadLayout({ children }: DownloadLayoutProps) {
  return <>{children}</>;
}
