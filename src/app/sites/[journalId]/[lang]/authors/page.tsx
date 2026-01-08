import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { getServerTranslations, t } from '@/utils/server-i18n';
import { connection } from 'next/server';
import './Authors.scss';

const AuthorsClient = dynamic(() => import('./AuthorsClient'), {
  loading: () => <div className="loader">Chargement...</div>,
});

export const metadata: Metadata = {
  title: 'Auteurs',
  description: 'Liste des auteurs',
};

interface AuthorsPageProps {
  params: Promise<{ lang: string; journalId: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function AuthorsPage(props: AuthorsPageProps) {
  // Dynamic rendering: uses searchParams (search, letter, pagination)
  await connection();

  const searchParams = await props.searchParams;
  const params = await props.params;
  const { lang } = params;

  // Extract initial params
  const page = searchParams?.page ? Math.max(1, parseInt(searchParams.page as string, 10)) : 1;
  const search = (searchParams?.search as string) || '';
  const letter = (searchParams?.letter as string) || '';

  // Fetch translations
  const translations = await getServerTranslations(lang);

  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    content: t('common.content', translations),
    authors: t('pages.authors.title', translations),
  };

  const countLabels = {
    author: t('common.author', translations),
    authors: t('common.authors', translations),
    authorFor: t('common.authorFor', translations),
    authorsFor: t('common.authorsFor', translations),
    others: t('pages.authors.others', translations),
  };

  return (
    <AuthorsClient
      initialPage={page}
      initialSearch={search}
      initialLetter={letter}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
      countLabels={countLabels}
    />
  );
}
