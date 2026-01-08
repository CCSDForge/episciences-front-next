'use client';

import { Provider } from 'react-redux';
import store from '@/store';
import Header from '@/components/Header/Header';

interface ClientLayoutProps {
  children: React.ReactNode;
  currentJournal: {
    id: number;
    code: string;
    name: string;
    description: string;
    createdAt: string;
    updatedAt: string;
  };
}

export default function ClientLayout({ children, currentJournal }: ClientLayoutProps) {
  return (
    <Provider store={store}>
      <Header currentJournal={currentJournal} />
      {children}
    </Provider>
  );
}
