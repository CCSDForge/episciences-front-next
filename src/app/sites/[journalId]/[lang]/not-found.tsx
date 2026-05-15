'use client';

import { useTranslation } from 'react-i18next';
import { Link } from '@/components/Link/Link';
import '@/styles/pages/NotFound.scss';

export default function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="not-found">
      <p className="not-found-code" aria-hidden="true">
        {t('pages.notFound.code')}
      </p>
      <h1 className="not-found-title">{t('pages.notFound.title')}</h1>
      <p className="not-found-description">{t('pages.notFound.description')}</p>
      <Link href="/" className="not-found-link">
        {t('pages.notFound.backHome')}
      </Link>
    </div>
  );
}
