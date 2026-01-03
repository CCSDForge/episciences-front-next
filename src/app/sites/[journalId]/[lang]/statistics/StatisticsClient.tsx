'use client';

import { useState, useEffect, Fragment, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useRouter } from 'next/navigation';
import PageTitle from '@/components/PageTitle/PageTitle';
import { fetchStatistics } from '@/services/statistics';
import { useAppSelector } from "@/hooks/store";
import { IStat, IStatResponse, IStatValueEvaluation, getFormattedStatsAsPieChart, isIStatValueDetails, isIStatValueEvaluation } from '@/types/stat';
import { STAT_TYPE, IStatisticsPerLabel, STAT_LABEL, statTypes, statEvaluationTypes } from '@/utils/stat';
import Breadcrumb from "@/components/Breadcrumb/Breadcrumb";
import Loader from '@/components/Loader/Loader';
import PieChart from '@/components/Charts/PieChart/PieChart';
import StatisticsMobileModal from '@/components/Modals/StatisticsMobileModal/StatisticsMobileModal';
import StatisticsSidebar, { IStatisticsYearSelection } from '@/components/Sidebars/StatisticsSidebar/StatisticsSidebar';
import { statisticsBlocksConfiguration } from '@/config/statistics';

// import caretUp from '/icons/caret-up-red.svg';
// import caretDown from '/icons/caret-down-red.svg';
// import filter from '/icons/filter.svg';
import caretUp from '/public/icons/caret-up-red.svg';
import caretDown from '/public/icons/caret-down-red.svg';
import filter from '/public/icons/filter.svg';

interface StatisticsClientProps {
  initialStats?: IStatResponse;
}

export default function StatisticsClient({ initialStats }: StatisticsClientProps = {}): JSX.Element {
  const { t, i18n } = useTranslation();
  const router = useRouter();

  const journalName = useAppSelector(state => state.journalReducer.currentJournal?.name);
  const journalCode = useAppSelector(state => state.journalReducer.currentJournal?.code);

  const [statisticsPerLabel, setStatisticsPerLabel] = useState<IStatisticsPerLabel[]>([
    { labelKey: STAT_LABEL.GLANCE, labelPath: 'pages.statistics.labels.glance', statistics: [], isOpened: true },
    { labelKey: STAT_LABEL.EVALUATION_PUBLICATION, labelPath: 'pages.statistics.labels.evaluationPublication', statistics: [], isOpened: true }
  ]);
  const [years, setYears] = useState<IStatisticsYearSelection[]>([]);
  const [openedFiltersMobileModal, setOpenedFiltersMobileModal] = useState(false);
  const [stats, setStats] = useState<IStatResponse | null>(initialStats || null);
  const [isLoading, setIsLoading] = useState(!initialStats);

  const getSelectedYears = useCallback((): number[] => years.filter(y => y.isChecked).map(y => y.year), [years]);

  // Chargement initial des statistiques si pas de données pré-chargées
  useEffect(() => {
    const loadInitialStatistics = async () => {
      if (initialStats || !journalCode) return;

      setIsLoading(true);
      try {
        const response = await fetchStatistics({
          rvcode: journalCode,
          page: 1,
          itemsPerPage: 7
        });

        // Obtenir les années disponibles
        const currentYear = new Date().getFullYear();
        const availableYears = Array.from({length: 5}, (_, i) => currentYear - i);

        // Adapter la réponse au format attendu
        const formattedStats: IStatResponse = {
          'hydra:member': response,
          'hydra:totalItems': response.length,
          'hydra:range': {
            years: availableYears
          },
          data: response,
          totalItems: response.length,
          range: {
            years: availableYears
          }
        };

        setStats(formattedStats);
      } catch (error) {
        console.error('Erreur lors du chargement initial des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadInitialStatistics();
  }, [journalCode, initialStats]);

  useEffect(() => {
    if (stats?.range?.years && years.length === 0) {
      const initYears = stats.range.years.map((y) => ({
        year: y,
        isChecked: false
      }));

      setYears(initYears);
    }
  }, [stats?.range?.years, years.length]);

  useEffect(() => {
    if (stats && stats.data) {
      const glanceStatTypes = [STAT_TYPE.ACCEPTANCE_RATE, STAT_TYPE.NB_SUBMISSIONS, STAT_TYPE.NB_SUBMISSIONS_DETAILS];
      const evaluationPublicationStatTypes = [STAT_TYPE.EVALUATION, STAT_TYPE.MEDIAN_SUBMISSION_PUBLICATION];

      const glanceStats = stats.data.filter((stat) => glanceStatTypes.includes(stat.name as STAT_TYPE));
      let evaluationPublicationStats = stats.data.filter((stat) => evaluationPublicationStatTypes.includes(stat.name as STAT_TYPE));

      const evaluationStat = evaluationPublicationStats.find((stat) => stat.value !== null && isIStatValueEvaluation(stat.value!));
      if (evaluationStat) {
        evaluationPublicationStats.push({
          name: 'medianReviewsNumber',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['median-reviews-number'] ?? 0
        });

        evaluationPublicationStats.push({
          name: 'reviewsReceived',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['reviews-received'] ?? 0
        });

        evaluationPublicationStats.push({
          name: 'reviewsRequested',
          unit: evaluationStat.unit,
          value: (evaluationStat.value as IStatValueEvaluation)['reviews-requested'] ?? 0
        });

        evaluationPublicationStats = evaluationPublicationStats.filter((stat) => stat.value !== null && !isIStatValueEvaluation(stat.value!));
      }

      setStatisticsPerLabel(prevStatisticsPerLabel => {
        return prevStatisticsPerLabel.map((statisticPerLabel) => {
          return {
            ...statisticPerLabel,
            statistics: statisticPerLabel.labelKey === STAT_LABEL.GLANCE ? glanceStats : evaluationPublicationStats
          };
        });
      });
    }
  }, [stats]);

  const selectedYearsStr = getSelectedYears().join(',');

  useEffect(() => {
    const fetchUpdatedStatistics = async () => {
      const selectedYears = selectedYearsStr ? selectedYearsStr.split(',').map(Number) : [];

      // Ne rien faire si le composant n'est pas initialisé (pas de journalCode ou years vide)
      if (!journalCode || years.length === 0) return;

      setIsLoading(true);
      try {
        const updatedStats = await fetchStatistics({
          rvcode: journalCode,
          // Si aucune année n'est sélectionnée, on ne passe pas le filtre years (toutes les années)
          // Si au moins une année est sélectionnée, on filtre par ces années
          years: selectedYears.length > 0 ? selectedYears : undefined,
        });

        // Adapter la réponse au format attendu
        const formattedStats: IStatResponse = {
          'hydra:member': updatedStats,
          'hydra:totalItems': updatedStats.length,
          'hydra:range': stats?.range,
          data: updatedStats,
          totalItems: updatedStats.length,
          range: stats?.range
        };

        setStats(formattedStats);
      } catch (error) {
        console.error('Erreur lors de la récupération des statistiques:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUpdatedStatistics();
  }, [selectedYearsStr, journalCode, years.length, stats?.range]);

  const onCheckYear = (year: number): void => {
    const updatedYears = years.map((y) => {
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
    const updatedStatistics = statisticsPerLabel.map((statisticPerLabel) => {
      if (statisticPerLabel.labelKey === labelKey) {
        return {
          ...statisticPerLabel,
          isOpened: !statisticPerLabel.isOpened
        };
      }

      return { ...statisticPerLabel };
    });

    setStatisticsPerLabel(updatedStatistics);
  };

  const renderSelectedYears = (): string => getSelectedYears().reverse().join(', ');

  const getBlockRendering = (statName: string) => statisticsBlocksConfiguration().find((config) => config.key === statName);

  const breadcrumbItems = [
    { path: '/', label: `${t('pages.home.title')} > ${t('common.about')} >` }
  ];

  return (
    <main className='statistics'>
      <PageTitle title={t('pages.statistics.title')} />

      <Breadcrumb parents={breadcrumbItems} crumbLabel={t('pages.statistics.title')} />
      <div className='statistics-title'>
        <h1 className='statistics-title-text'>{t('pages.statistics.title')}</h1>
        <div className='statistics-title-year'>
          <span>{renderSelectedYears()}</span>
          <div className="statistics-title-year-filtersMobile">
            <div className="statistics-title-year-filtersMobile-tile" onClick={(): void => setOpenedFiltersMobileModal(!openedFiltersMobileModal)}>
              <img className="statistics-title-year-filtersMobile-tile-icon" src={filter} alt='List icon' />
              <div className="statistics-title-year-filtersMobile-tile-text">{getSelectedYears().length > 0 ? `${t('common.filters.editFilters')} (${getSelectedYears().length})` : `${t('common.filters.filter')}`}</div>
            </div>
            {openedFiltersMobileModal && <StatisticsMobileModal t={t} years={years} onUpdateYearsCallback={setYears} onCloseCallback={(): void => setOpenedFiltersMobileModal(false)}/>}
          </div>
        </div>
      </div>
      <div className='statistics-content'>
        <div className='statistics-content-results'>
          <StatisticsSidebar t={t} years={years} onCheckYearCallback={onCheckYear} />
          {isLoading ? (
            <Loader />
          ) : (
            <div className='statistics-content-results-cards'>
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
                  <div key={index} className='statistics-content-results-cards-row'>
                    <div className="statistics-content-results-cards-row-title" onClick={(): void => toggleStatisticsSection(statisticPerLabel.labelKey)}>
                      <div className="statistics-content-results-cards-row-title-text">{t(statisticPerLabel.labelPath)}</div>
                      {statisticPerLabel.isOpened ? (
                      <img className='statistics-content-results-cards-row-title-caret' src={caretUp} alt='Caret up icon' />
                    ) : (
                      <img className='statistics-content-results-cards-row-title-caret' src={caretDown} alt='Caret down icon' />
                    )}
                    </div>
                    <div className={`statistics-content-results-cards-row-stats ${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION && "statistics-content-results-cards-row-stats-evaluation"} ${statisticPerLabel.isOpened && "statistics-content-results-cards-row-stats-active"}`}>
                      {filteredStatistics.map((statistic, index) => (
                        <Fragment key={index}>
                          <div className='statistics-content-results-cards-row-stats-row'>
                            {statistic.value && isIStatValueDetails(statistic.value) ? (
                              <PieChart t={t} data={getFormattedStatsAsPieChart(statistic.value)} />
                            ) : (
                              <>
                                {statistic.unit ? (
                                  <div
                                    className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? "statistics-content-results-cards-row-stats-row-stat statistics-content-results-cards-row-stats-row-stat-evaluation" : "statistics-content-results-cards-row-stats-row-stat"}`}
                                  >
                                    {statistic.value}{i18n.exists(`common.${statistic.unit}`) ? (
                                      <span className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION && "statistics-content-results-cards-row-stats-row-stat-unit statistics-content-results-cards-row-stats-row-stat-unit-evaluation"}`}>
                                        {statistic.value && statistic.value > 1 ? t(`common.${statistic.unit}s`) : t(`common.${statistic.unit}`)}
                                      </span>
                                    ) : (
                                      <span className='statistics-content-results-cards-row-stats-row-stat-unit'>{statistic.unit}</span>
                                    )}
                                  </div>
                                ) :
                                  <div className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? "statistics-content-results-cards-row-stats-row-stat statistics-content-results-cards-row-stats-row-stat-evaluation" : "statistics-content-results-cards-row-stats-row-stat"}`}>{statistic.value}</div>
                                }
                                <div className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? "statistics-content-results-cards-row-stats-row-title statistics-content-results-cards-row-stats-row-title-evaluation" : "statistics-content-results-cards-row-stats-row-title"}`}>{getStatisticTitle(statistic)}</div>
                              </>
                            )}
                          </div>
                          {index !== filteredStatistics.length - 1 && (
                            <div className={`${statisticPerLabel.labelKey === STAT_LABEL.EVALUATION_PUBLICATION ? (
                              `statistics-content-results-cards-row-stats-divider statistics-content-results-cards-row-stats-divider-evaluation ${index % 2 === 1 && 'statistics-content-results-cards-row-stats-divider-evaluation-second'}`
                            ) : (
                              `statistics-content-results-cards-row-stats-divider statistics-content-results-cards-row-stats-divider-glance ${index % 2 === 1 && 'statistics-content-results-cards-row-stats-divider-glance-second'}`
                            )}`}></div>
                          )}
                          {(index !== filteredStatistics.length - 1) && index % 2 === 1 && (
                            <div className='statistics-content-results-cards-row-stats-mobileLine'></div>
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