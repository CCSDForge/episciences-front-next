export interface IStat {
  name: string;
  value?: IStatValue;
  unit?: string;
}

type IStatValue = number | IStatValueDetails;

interface IStatValueDetails {
  published?: number;
  refused?: number;
  'being-to-publish'?: {
    accepted?: number;
    'other-status'?: number;
  }
}

export const isIStatValueDetails = (value: IStatValue): value is IStatValueDetails => {
  const detailsValue = value as IStatValueDetails | undefined;

  return detailsValue ? (detailsValue.published !== undefined || detailsValue.refused !== undefined || detailsValue['being-to-publish'] !== undefined) : false;
}

export interface IStatValueDetailsAsPieChart {
  status: string;
  count: number;
  isBeingToPublishStatus?: boolean;
}

export const getFormattedStatsAsPieChart = (value: IStatValue): IStatValueDetailsAsPieChart[] => {
  const stats: IStatValueDetailsAsPieChart[] = [];

  if (!isIStatValueDetails(value)) return stats;
  const typedValue = value as IStatValueDetails;

  if (typedValue.published !== undefined) {
    stats.push({ status: 'published', count: typedValue.published })
  }

  if (typedValue.refused !== undefined) {
    stats.push({ status: 'refused', count: typedValue.refused })
  }

  if (typedValue['being-to-publish'] !== undefined && typedValue['being-to-publish'].accepted !== undefined) {
    stats.push({ status: 'accepted', count: typedValue['being-to-publish'].accepted, isBeingToPublishStatus: true })
  }

  if (typedValue['being-to-publish'] !== undefined && typedValue['being-to-publish']['other-status'] !== undefined) {
    stats.push({ status: 'other-status', count: typedValue['being-to-publish']['other-status'], isBeingToPublishStatus: true })
  }

  return stats;
}

export interface IStatValueEvaluation {
  'median-reviews-number'?: number;
  'reviews-received'?: number;
  'reviews-requested'?: number;
}

export const isIStatValueEvaluation = (value: IStatValue): boolean => {
  const evaluationValue = value as IStatValueEvaluation | undefined;

  return evaluationValue ? (evaluationValue['median-reviews-number'] !== undefined || evaluationValue['reviews-received'] !== undefined || evaluationValue['reviews-requested'] !== undefined) : false;
}

export interface IStatResponse {
  'hydra:member': IStat[];
  'hydra:totalItems': number;
  'hydra:range'?: {
    years?: number[];
  };
  data: IStat[];
  totalItems: number;
  range?: {
    years?: number[];
  };
}