import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import './Authors.scss';

const AuthorsClient = dynamic(() => import('./AuthorsClient'), {
  loading: () => <div className="loader">Chargement...</div>,
});

export const metadata: Metadata = {
  title: 'Auteurs',
  description: 'Liste des auteurs',
};

export default function AuthorsPage() {
  return <AuthorsClient />;
}
 