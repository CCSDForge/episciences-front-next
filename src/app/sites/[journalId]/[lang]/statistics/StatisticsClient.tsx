'use client';

import { CaretUpBlackIcon, CaretDownBlackIcon, FilterIcon } from '@/components/icons';
import { useState, useEffect, Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle/PageTitle';
import { useClientSideFetch } from '@/hooks/useClientSideFetch';
import { fetchStatistics } from '@/services/statistics';
import { useAppSelector } from '@/hooks/store';
import {
  IStat,
  IStatResponse,
  IStatValueEvaluation,
  getFormattedStatsAsPieChart,
  isIStatValueDetails,
  isIStatValueEvaluation,
} from '@/types/stat';
import {
  STAT_TYPE,
  IStatisticsPerLabel,
  STAT_LABEL,
  statTypes,
  statEvaluationTypes,
} from '@/utils/stat';
import Breadcrumb from '@/components/Breadcrumb/Breadcrumb';
import Loader from '@/components/Loader/Loader';
import PieChart from '@/components/Charts/PieChart/PieChart';
import StatisticsMobileModal from '@/components/Modals/StatisticsMobileModal/StatisticsMobileModal';
import { handleKeyboardClick } from '@/utils/keyboard';
import StatisticsSidebar, {
  IStatisticsYearSelection,
} from '@/components/Sidebars/StatisticsSidebar/StatisticsSidebar';
import { statisticsBlocksConfiguration } from '@/config/statistics';

interface StatisticsClientProps {
  initialStats?: IStatResponse;
  lang?: string;
  breadcrumbLabels?: {
    home: string;
    statistics: string;
  };
}

export default function StatisticsClient({
  initialStats,
  lang,
  breadcrumbLabels,
}: StatisticsClientProps = {}): React.JSX.Element {
  const { t, i18n } = useTranslation();

  // Synchroniser la langue avec le paramètre de l'URL
  useEffect(() => {
    if (lang && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
  }, [lang, i18n]);
  const router = useRouter();

  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);
  const journalCode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [statisticsPerLabel, setStatisticsPerLabel] = useState<IStatisticsPerLabel[]>([
    {
      labelKey: STAT_LABEL.GLANCE,
      labelPath: 'pages.statistics.labels.glance',
      statistics: [],
      isOpened: true,
    },
    {
      labelKey: STAT_LABEL.EVALUATION_PUBLICATION,
      labelPath: 'pages.statistics.labels.evaluationPublication',
      statistics: [],
      isOpened: true,
    },
  ]);
  const [years, setYears] = useState<IStatisticsYearSelection[]>([]);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);

  const {
    data: stats,
    isUpdating: isLoading,
    refetch,
  } = useClientSideFetch({
    fetchFn: async () => {
      if (!journalCode) return null;
      const response = await fetchStatistics({
        rvcode: journalCode,
        page: 1,
        itemsPerPage: 7,
        years: getSelectedYears().length > 0 ? getSelectedYears() : undefined,
      });

      // Get current year and generate 5 years range if not available in response
      const currentYear = new Date().getFullYear();
      const availableYears = Array.from({ length: 5 }, (_, i) => currentYear - i);

      return {
        'hydra:member': response,
        'hydra:totalItems': response.length,
        'hydra:range': {
          years: availableYears,
        },
        data: response,
        totalItems: response.length,
        range: {
          years: availableYears,
        },
      };
    },
    initialData: initialStats || null,
    enabled: !!journalCode,
  });

  const getSelectedYears = useCallback(
    (): number[] => years.filter(y => y.isChecked).map(y => y.year),
    [years]
  );

  useEffect(() => {
    if (stats?.range?.years && years.length === 0) {
      const initYears = stats.range.years.map(y => ({
        year: y,
        isChecked: false,
      }));

      setYears(initYears);
    }
  }, [stats?.range?.years, years.length]);

  useEffect(() => {
    if (stats && stats.data) {
      const glanceStatTypes = [
        STAT_TYPE.ACCEPTANCE_RATE,
        STAT_TYPE.NB_SUBMISSIONS,
        STAT_TYPE.NB_SUBMISSIONS_DETAILS,
      ];
      const evaluationPublicationStatTypes = [
        STAT_TYPE.EVALUATION,
        STAT_TYPE.MEDIAN_SUBMISSION_PUBLICATION,
      ];

      const glanceStats = stats.data.filter(stat =>
        glanceStatTypes.includes(stat.name as STAT_TYPE)
      );
      let evaluationPublicationStats = stats.data.filter(stat =>
        evaluationPublicationStatTypes.includes(stat.name as STAT_TYPE)
      );

      const evaluationStat = evaluationPublicationStats.find(
        stat => stat.value !== null && isIStatValueEvaluation(stat.value!)
      );
      if (evaluationStat) {
        evaluationPublicationStats.push({
          name: 'medianReviewsNumber',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['median-reviews-number'] ?? 0,
        });

        evaluationPublicationStats.push({
          name: 'reviewsReceived',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['reviews-received'] ?? 0,
        });

        evaluationPublicationStats.push({
          name: 'reviewsRequested',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['reviews-requested'] ?? 0,
        });

        evaluationPublicationStats = evaluationPublicationStats.filter(
          stat => stat.value !== null && !isIStatValueEvaluation(stat.value!)
        );
      }

      setStatisticsPerLabel(prevStatisticsPerLabel => {
        return prevStatisticsPerLabel.map(statisticPerLabel => {
          return {
            ...statisticPerLabel,
            statistics:
              statisticPerLabel.labelKey === STAT_LABEL.GLANCE
                ? glanceStats
                : evaluationPublicationStats,
          };
        });
      });
    }
  }, [stats]);

  const selectedYearsStr = getSelectedYears().join(',');

  useEffect(() => {
    if (journalCode) {
      refetch();
    }
  }, [selectedYearsStr, journalCode]); // eslint-disable-line react-hooks/exhaustive-deps

  const onCheckYear = (year: number): void => {
    const updatedYears = years.map(y => {
      if (y.year === year) {
        return { ...y, isChecked: !y.isChecked };
      }

      return { ...y };
    });

    setYears(updatedYears);

    // Mettre à jour l'URL avec les années sélectionnées
    const selectedYears = updatedYears.filter(y => y.isChecked).map(y => y.year);
    const searchParams = new URLSearchParams(window.location.search);

    // Effacer les années existantes
    searchParams.delete('years');

    // Ajouter les nouvelles années sélectionnées
    selectedYears.forEach(year => {
      searchParams.append('years', year.toString());
    });

    const newUrl = `${window.location.pathname}${selectedYears.length > 0 ? `?${searchParams.toString()}` : ''}`;
    router.push(newUrl);
  };

  const getStatisticTitle = (statistic: IStat): string | undefined => {
    if (statTypes.find(stat => stat.value === statistic.name)) {
      return t(statTypes.find(stat => stat.value === statistic.name)?.labelPath!);
    }

    if (statEvaluationTypes.find(stat => stat.value === statistic.name)) {
      return t(statEvaluationTypes.find(stat => stat.value === statistic.name)?.labelPath!);
    }

    return;
  };

  const toggleStatisticsSection = (labelKey: STAT_LABEL): void => {
    const updatedStatistics = statisticsPerLabel.map(statisticPerLabel => {
      if (statisticPerLabel.labelKey === labelKey) {
        return {
          ...statisticPerLabel,
          isOpened: !statisticPerLabel.isOpened,
        };
      }

      return { ...statisticPerLabel };
    });

    setStatisticsPerLabel(updatedStatistics);
  };

  const renderSelectedYears = (): string => getSelectedYears().reverse().join(', ');

  const getBlockRendering = (statName: string) =>
    statisticsBlocksConfiguration().find(config => config.key === statName);

  const breadcrumbItems = [
    {
      path: '/',
      label: breadcrumbLabels ? `${breadcrumbLabels.home} >` : `${t('pages.home.title')} >`,
    },
  ];

  return (
    <main className="statistics">
      <PageTitle title={breadcrumbLabels?.statistics || t('pages.statistics.title')} />

      <Breadcrumb
        parents={breadcrumbItems}
        crumbLabel={breadcrumbLabels?.statistics || t('pages.statistics.title')}
        lang={lang}
      />
      <h1 className="statistics-title">
        {breadcrumbLabels?.statistics || t('pages.statistics.title')}
      </h1>
      <div className="statistics-content">
        <div className="statistics-content-results">
          <StatisticsSidebar t={t} years={years} onCheckYearCallback={onCheckYear} />
          {isLoading ? (
            <Loader />
          ) : (
            <div className="statistics-content-results-cards">
              {statisticsPerLabel.map((statisticPerLabel, index) => {
                let filteredStatistics = statisticPerLabel.statistics
                  .filter(statistic => statistic.value !== null)
                  .filter(statistic => getBlockRendering(statistic.name)?.render);

                filteredStatistics = filteredStatistics.sort((a, b) => {
                  const configA = getBlockRendering(a.name);
                  const configB = getBlockRendering(b.name);
                  return (configA?.order ?? 0) - (configB?.order ?? 0);
                });

                return (
                  <div key={index} className="statistics-content-results-cards-row">
                    <div
                      className="statistics-content-results-cards-row-title"
                      role="button"
                      tabIndex={0}
                      aria-expanded={statisticPerLabel.isOpened}
                      onClick={(): void => toggleStatisticsSection(statisticPerLabel.labelKey)}
                      onKeyDown={(e) =>
                        handleKeyboardClick(e, () => toggleStatisticsSection(statisticPerLabel.labelKey))
                      }
                    >
                      <div className="statistics-content-results-cards-row-title-text">
                        {t(statisticPerLabel.labelPath)}
                      </div>
                      {statisticPerLabel.isOpened ? (
                        <CaretUpBlackIcon
                          size={16}
                          className="statistics-content-results-cards-row-title-caret"
                          ariaLabel="Collapse section"
                        />
                      ) : (
                        <CaretDownBlackIcon
                          size={16}
                          className="statistics-content-results-cards-row-title-caret"
                          ariaLabel="Expand section"
                        />
                      )}
                    </div>
                    <div
                      className={`statistics-content-results-cards-row-stats ${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION && 'statistics-content-results-cards-row-stats-evaluation'} ${statisticPerLabel.isOpened && 'statistics-content-results-cards-row-stats-active'}`}
                    >
                      {filteredStatistics.map((statistic, index) => (
                        <Fragment key={index}>
                          <div className="statistics-content-results-cards-row-stats-row">
                            {statistic.value && isIStatValueDetails(statistic.value) ? (
                              <PieChart t={t} data={getFormattedStatsAsPieChart(statistic.value)} />
                            ) : (
                              <>
                                {statistic.unit ? (
                                  <div
                                    className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? 'statistics-content-results-cards-row-stats-row-stat statistics-content-results-cards-row-stats-row-stat-evaluation' : 'statistics-content-results-cards-row-stats-row-stat'}`}
                                  >
                                    {statistic.value}
                                    {i18n.exists(`common.${statistic.unit}`) ? (
                                      <span
                                        className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION && 'statistics-content-results-cards-row-stats-row-stat-unit statistics-content-results-cards-row-stats-row-stat-unit-evaluation'}`}
                                      >
                                        {statistic.value && statistic.value > 1
                                          ? t(`common.${statistic.unit}s`)
                                          : t(`common.${statistic.unit}`)}
                                      </span>
                                    ) : (
                                      <span className="statistics-content-results-cards-row-stats-row-stat-unit">
                                        {statistic.unit}
                                      </span>
                                    )}
                                  </div>
                                ) : (
                                  <div
                                    className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? 'statistics-content-results-cards-row-stats-row-stat statistics-content-results-cards-row-stats-row-stat-evaluation' : 'statistics-content-results-cards-row-stats-row-stat'}`}
                                  >
                                    {statistic.value}
                                  </div>
                                )}
                                <div
                                  className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? 'statistics-content-results-cards-row-stats-row-title statistics-content-results-cards-row-stats-row-title-evaluation' : 'statistics-content-results-cards-row-stats-row-title'}`}
                                >
                                  {getStatisticTitle(statistic)}
                                </div>
                              </>
                            )}
                          </div>
                          {index !== filteredStatistics.length - 1 && (
                            <div
                              className={`${
                                statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION
                                  ? `statistics-content-results-cards-row-stats-divider statistics-content-results-cards-row-stats-divider-evaluation ${index % 2 === 1 && 'statistics-content-results-cards-row-stats-divider-evaluation-second'}`
                                  : `statistics-content-results-cards-row-stats-divider statistics-content-results-cards-row-stats-divider-glance ${index % 2 === 1 && 'statistics-content-results-cards-row-stats-divider-glance-second'}`
                              }`}
                            ></div>
                          )}
                          {index !== filteredStatistics.length - 1 && index % 2 === 1 && (
                            <div className="statistics-content-results-cards-row-stats-mobileLine"></div>
                          )}
                        </Fragment>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
