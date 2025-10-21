import { Metadata } from 'next';
import dynamicImport from 'next/dynamic';

import { generateLanguageParamsForPage } from "@/utils/static-params-helper";

const AuthorsClient = dynamicImport(() => import('./AuthorsClient'), );

export const metadata: Metadata = {
  title: 'Auteurs',
};

export function generateStaticParams() {
  return generateLanguageParamsForPage('authors');
}

export default function AuthorsPage({ params }: { params: { lang: string } }) {
  const lang = params.lang || 'en';

  // Valeurs par défaut pour la génération statique
  // Les paramètres seront gérés côté client
  return (
    <AuthorsClient
      initialPage={1}
      initialSearch=""
      initialLetter=""
      lang={lang}
    />
  );
} 