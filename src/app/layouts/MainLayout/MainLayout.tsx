'use client';

import { ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

import Header from "@/components/Header/Header";
import Footer from "@/components/Footer/Footer";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps): JSX.Element { 
  return (
    <>
      <ToastContainer bodyClassName='toast-message' />
      <Header />
      <main>
        {children}
      </main>
      <Footer />
    </>
  )
} 