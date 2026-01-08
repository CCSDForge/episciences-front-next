'use client';

import { Fragment, useState, useEffect } from 'react';
import { TFunction, i18n } from 'i18next';
import { isMobileOnly } from 'react-device-detect';

import { IStat, isIStatValueDetails } from '@/types/stat';
import { statTypes } from '@/utils/stat';
import './StatisticsSection.scss';

interface IStatisticsSectionProps {
  t: TFunction<'translation', undefined>;
  i18n: i18n;
  stats: IStat[];
}

export default function StatisticsSection({
  t,
  i18n,
  stats,
}: IStatisticsSectionProps): React.JSX.Element {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const renderedStats = (): IStat[] => {
    if (isMounted && isMobileOnly) {
      return stats.slice(0, 2);
    }

    return stats;
  };

  return (
    <div className="statisticsSection">
      {renderedStats().map((singleStat, index) =>
        singleStat.value && isIStatValueDetails(singleStat.value) ? (
          <></>
        ) : (
          <Fragment key={index}>
            <div className="statisticsSection-row">
              {singleStat.unit ? (
                <div className="statisticsSection-row-stat">
                  {singleStat.value}{' '}
                  {i18n.exists(`common.${singleStat.unit}`)
                    ? singleStat.value && singleStat.value > 1
                      ? t(`common.${singleStat.unit}s`)
                      : t(`common.${singleStat.unit}`)
                    : singleStat.unit}
                </div>
              ) : (
                <div className="statisticsSection-row-stat">{singleStat.value}</div>
              )}
              <div className="statisticsSection-row-title">
                {t(statTypes.find(stat => stat.value === singleStat.name)?.labelPath!)}
              </div>
            </div>
            <div
              className={`${index !== renderedStats().length - 1 && 'statisticsSection-divider'}`}
            ></div>
          </Fragment>
        )
      )}
    </div>
  );
}
