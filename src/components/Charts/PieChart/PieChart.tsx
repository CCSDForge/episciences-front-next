'use client';

import { useMemo } from 'react';
import { TFunction } from 'i18next';
import { Cell, Pie, PieChart as RechartsPieChart, ResponsiveContainer } from 'recharts';
import { IStatValueDetailsAsPieChart } from '@/types/stat';
import './PieChart.scss';

interface IPieChartProps {
  readonly t: TFunction<'translation', undefined>;
  readonly data: IStatValueDetailsAsPieChart[];
  /** Journal-specific config (server-provided); takes priority over build-time process.env */
  readonly journalConfig?: Record<string, string>;
}

export default function PieChart({ t, data, journalConfig }: IPieChartProps): React.JSX.Element {
  // Memoize chart colors — avoids array recreation per render
  const CHART_COLORS = useMemo(
    () => [
      journalConfig?.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_0 ||
        process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_0 ||
        '#9A312C',
      journalConfig?.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_1 ||
        process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_1 ||
        '#C9605B',
      journalConfig?.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_2 ||
        process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_2 ||
        '#FF9994',
      journalConfig?.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_3 ||
        process.env.NEXT_PUBLIC_JOURNAL_STATISTICS_COLORS_3 ||
        '#FFC9C7',
    ],
    [journalConfig]
  );

  const getLegend = (): React.JSX.Element => {
    const notBeingToPublishStatuses = data.filter(singleData => !singleData.isBeingToPublishStatus);
    const beingToPublishStatuses = data.filter(singleData => singleData.isBeingToPublishStatus);

    return (
      <div className="pieChart-legend">
        <div className="pieChart-legend-rows">
          {notBeingToPublishStatuses.map((singleData, index) =>
            getLegendRow(singleData, index, CHART_COLORS.slice(0, 2))
          )}
        </div>
        <div className="pieChart-legend-category">
          {t('pages.statistics.statuses.beingPublished')}
        </div>
        <div className="pieChart-legend-rows">
          {beingToPublishStatuses.map((singleData, index) =>
            getLegendRow(singleData, index, CHART_COLORS.slice(2, 4))
          )}
        </div>
      </div>
    );
  };

  const getLegendRow = (
    singleData: IStatValueDetailsAsPieChart,
    index: number,
    colors: string[]
  ): React.JSX.Element => {
    const statusLabel = t(`pages.statistics.statuses.${singleData.status}`);

    return (
      <div key={singleData.status} className="pieChart-legend-rows-row">
        <div
          className="pieChart-legend-rows-row-square"
          style={{ backgroundColor: colors[index % colors.length] }}
        ></div>
        <div>{`${singleData.count} ${statusLabel}`}</div>
      </div>
    );
  };

  return (
    <div className="pieChart">
      <ResponsiveContainer>
        <RechartsPieChart>
          <Pie dataKey="count" data={data}>
            {data.map((entry, index) => (
              <Cell key={entry.status} fill={CHART_COLORS[index % CHART_COLORS.length]} />
            ))}
          </Pie>
        </RechartsPieChart>
      </ResponsiveContainer>
      {getLegend()}
    </div>
  );
}
