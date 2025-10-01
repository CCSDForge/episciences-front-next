import { Metadata } from 'next';
import dynamicImport from 'next/dynamic';

import { generateLanguageParams } from "@/utils/static-params-helper";
import { getLanguageFromParams } from "@/utils/language-utils";
const AuthorsClient = dynamicImport(() => import('./AuthorsClient'), { ssr: false });

export const metadata: Metadata = {
  title: 'Auteurs',
};

export function generateStaticParams() {
  // Pour le mode statique, générer uniquement une page d'auteurs vide
  return generateLanguageParams();
}

export default function AuthorsPage() {
  // Valeurs par défaut pour la génération statique
  // Les paramètres seront gérés côté client
  return (
    <AuthorsClient
      initialPage={1}
      initialSearch=""
      initialLetter=""
    />
  );
} 