'use client';

import ToastContainerWrapper from '@/components/ToastContainerWrapper/ToastContainerWrapper';
import Header from '@/components/Header/Header';
import Footer from '@/components/Footer/Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps): React.JSX.Element {
  return (
    <>
      <ToastContainerWrapper />
      <Header />
      <main id="main-content">{children}</main>
      <Footer />
    </>
  );
}
