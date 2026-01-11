import { Metadata } from 'next';
import dynamic from 'next/dynamic';
import { fetchStatistics } from '@/services/statistics';
import { getServerTranslations, t } from '@/utils/server-i18n';
import type { IStatResponse } from '@/types/stat';
import './Statistics.scss';

const StatisticsClient = dynamic(() => import('./StatisticsClient'));

// Statistics revalidate every hour
export const revalidate = 3600;

export const metadata: Metadata = {
  title: 'Statistiques',
  description: 'Statistiques de la revue',
};

type Props = {
  params: Promise<{ journalId: string; lang: string }>;
};

export default async function StatisticsPage(props: Props) {
  const params = await props.params;
  const { journalId, lang } = params;

  // Pre-fetch stats and translations server-side to avoid flashing
  let initialStats: IStatResponse | undefined = undefined;
  try {
    if (journalId) {
      const statsData = await fetchStatistics({
        rvcode: journalId,
        page: 1,
        itemsPerPage: 7,
      });

      // Get current year and generate 5 years range for the sidebar
      const currentYear = new Date().getFullYear();
      const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

      initialStats = {
        'hydra:member': statsData,
        'hydra:totalItems': statsData.length,
        'hydra:range': {
          years: availableYears,
        },
        data: statsData,
        totalItems: statsData.length,
        range: {
          years: availableYears,
        },
      };
    }
  } catch (error) {
    console.warn(`[Build] Could not reach API for Statistics of journal "${journalId}".`);
  }

  const translations = await getServerTranslations(lang);
  const breadcrumbLabels = {
    home: t('pages.home.title', translations),
    statistics: t('pages.statistics.title', translations),
  };

  return (
    <StatisticsClient
      initialStats={initialStats}
      lang={lang}
      breadcrumbLabels={breadcrumbLabels}
    />
  );
}
