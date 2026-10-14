'use client';

import { TFunction } from 'i18next';

import FilterChoiceList, { IFilterChoice } from '@/components/FilterChoiceList/FilterChoiceList';
import './ArticlesSidebar.scss';

export interface IArticleTypeSelection {
  labelPath: string;
  value: string;
  isChecked: boolean;
}

export interface IArticleYearSelection {
  year: number;
  isChecked: boolean;
}

/** Whole filter selection, as applied at once by the mobile modal. */
export interface IArticleFiltersSelection {
  types: IArticleTypeSelection[];
  years: IArticleYearSelection[];
}

/**
 * Sidebar container: callers compose the facets they need, e.g.
 * `<ArticlesSidebar><ArticlesSidebarTypes …/><ArticlesSidebarYears …/></ArticlesSidebar>`.
 */
export default function ArticlesSidebar({
  children,
}: {
  readonly children: React.ReactNode;
}): React.JSX.Element {
  return <div className="articlesSidebar">{children}</div>;
}

interface ISidebarFacetProps<V extends string | number> {
  readonly modifier: string;
  readonly title: string;
  readonly choices: IFilterChoice<V>[];
  readonly onToggle: (value: V) => void;
}

function SidebarFacet<V extends string | number>({
  modifier,
  title,
  choices,
  onToggle,
}: ISidebarFacetProps<V>): React.JSX.Element {
  return (
    <div className={`articlesSidebar-section ${modifier}`}>
      <div className="articlesSidebar-section-title">{title}</div>
      <div className="articlesSidebar-section-body">
        <FilterChoiceList
          base="articlesSidebar-section-list"
          choices={choices}
          onToggle={onToggle}
        />
      </div>
    </div>
  );
}

export function ArticlesSidebarTypes({
  t,
  types,
  onCheckTypeCallback,
}: {
  readonly t: TFunction<'translation', undefined>;
  readonly types: IArticleTypeSelection[];
  readonly onCheckTypeCallback: (value: string) => void;
}): React.JSX.Element {
  return (
    <SidebarFacet
      modifier="articlesSidebar-section-types"
      title={t('common.filters.documentTypes')}
      choices={types.map(type => ({
        value: type.value,
        label: t(type.labelPath),
        isChecked: type.isChecked,
      }))}
      onToggle={onCheckTypeCallback}
    />
  );
}

export function ArticlesSidebarYears({
  t,
  years,
  onCheckYearCallback,
}: {
  readonly t: TFunction<'translation', undefined>;
  readonly years: IArticleYearSelection[];
  readonly onCheckYearCallback: (year: number) => void;
}): React.JSX.Element {
  return (
    <SidebarFacet
      modifier="articlesSidebar-section-years"
      title={t('common.filters.years')}
      choices={years.map(y => ({ value: y.year, label: String(y.year), isChecked: y.isChecked }))}
      onToggle={onCheckYearCallback}
    />
  );
}
