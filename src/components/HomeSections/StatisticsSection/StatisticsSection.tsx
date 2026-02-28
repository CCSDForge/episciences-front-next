'use client';

import { Fragment } from 'react';
import { TFunction, i18n } from 'i18next';

import { IStat, IStatValueEvaluation, isIStatValueDetails, isIStatValueEvaluation } from '@/types/stat';

type ISimpleStat = IStat & { value?: number };
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
  const filteredStats = stats.filter(
    (s): s is ISimpleStat =>
      !(s.value && (isIStatValueDetails(s.value) || isIStatValueEvaluation(s.value)))
  );

  return (
    <div className="statisticsSection">
      {filteredStats.map((singleStat, index) => (
        <Fragment key={singleStat.name}>
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
            className={`${index !== filteredStats.length - 1 && 'statisticsSection-divider'}`}
          ></div>
        </Fragment>
      ))}
    </div>
  );
}
