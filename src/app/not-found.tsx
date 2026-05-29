import Link from 'next/link';
import { getServerTranslations, t, defaultLanguage } from '@/utils/server-i18n';
import '@/styles/pages/NotFound.scss';

export default async function RootNotFound() {
  const translations = await getServerTranslations(defaultLanguage);

  const title = t('pages.notFound.title', translations);
  const description = t('pages.notFound.description', translations);
  const backHome = t('pages.notFound.backHome', translations);

  return (
    <div className="not-found">
      <p className="not-found-code" aria-hidden="true">
        404
      </p>
      <h1 className="not-found-title">{title}</h1>
      <p className="not-found-description">{description}</p>
      <Link href="/" className="not-found-link">
        {backHome}
      </Link>
    </div>
  );
}
