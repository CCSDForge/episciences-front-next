import { Metadata } from 'next';
import AuthorsClient from './AuthorsClient';

export const metadata: Metadata = {
  title: 'Auteurs',
};

export function generateStaticParams() {
  // Pour le mode statique, générer uniquement une page d'auteurs vide
  return [{}];
}

export const dynamic = 'force-static';

export default function AuthorsPage({
  searchParams,
}: {
  searchParams?: { [key: string]: string | string[] | undefined };
}) {
  // Valeurs par défaut pour la génération statique
  const page = searchParams?.page ? parseInt(searchParams.page as string, 10) : 1;
  const searchValue = searchParams?.search as string || '';
  const letter = searchParams?.letter as string || '';

  return (
    <AuthorsClient 
      initialPage={page} 
      initialSearch={searchValue}
      initialLetter={letter}
    />
  );
} 