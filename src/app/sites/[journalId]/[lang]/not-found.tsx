'use client';

import { useParams } from 'next/navigation';
import { Link } from '@/components/Link/Link';
import '@/styles/pages/NotFound.scss';

const translations: Record<string, { title: string; description: string; backHome: string }> = {
  fr: {
    title: 'Page introuvable',
    description: "La page que vous recherchez n'existe pas ou a peut-être été déplacée.",
    backHome: "Retour à l'accueil",
  },
  en: {
    title: 'Page not found',
    description: 'The page you are looking for does not exist or may have been moved.',
    backHome: 'Back to home',
  },
  es: {
    title: 'Página no encontrada',
    description: 'La página que busca no existe o puede haber sido movida.',
    backHome: 'Volver al inicio',
  },
};

export default function NotFound() {
  const params = useParams();
  const lang = (params?.lang as string) || 'fr';
  const tr = translations[lang] ?? translations['fr'];

  return (
    <div className="not-found">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 className="not-found-title">{tr.title}</h1>
      <p className="not-found-description">{tr.description}</p>
      <Link href="/" lang={lang} className="not-found-link">
        {tr.backHome}
      </Link>
    </div>
  );
}
