import { IStat } from "@/types/stat";

export enum STAT_TYPE {
  NB_SUBMISSIONS = 'nb-submissions',
  ACCEPTANCE_RATE = 'acceptance-rate',
  MEDIAN_SUBMISSION_PUBLICATION = 'median-submission-publication',
  MEDIAN_SUBMISSION_ACCEPTANCE = 'median-submission-acceptance',
  NB_SUBMISSIONS_DETAILS = 'nb-submissions-details',
  EVALUATION = 'evaluation',
}

export const statTypes: { labelPath: string; value: string; }[] = [
  { labelPath: 'pages.statistics.types.nbSubmissions', value: STAT_TYPE.NB_SUBMISSIONS },
  { labelPath: 'pages.statistics.types.acceptanceRate', value: STAT_TYPE.ACCEPTANCE_RATE },
  { labelPath: 'pages.statistics.types.medianSubmissionPublication', value: STAT_TYPE.MEDIAN_SUBMISSION_PUBLICATION },
  { labelPath: 'pages.statistics.types.medianSubmissionAcceptance', value: STAT_TYPE.MEDIAN_SUBMISSION_ACCEPTANCE },
  { labelPath: 'pages.statistics.types.nbSubmissionsDetails', value: STAT_TYPE.NB_SUBMISSIONS_DETAILS },
  { labelPath: 'pages.statistics.types.evaluation', value: STAT_TYPE.EVALUATION }
]

export enum STAT_EVALUATION_TYPE {
  MEDIAN_REVIEWS_NUMBER = 'medianReviewsNumber',
  REVIEWS_RECEIVED = 'reviewsReceived',
  REVIEWS_REQUESTED = 'reviewsRequested'
}

export const statEvaluationTypes: { labelPath: string; value: string; }[] = [
  { labelPath: 'pages.statistics.types.medianReviewsNumber', value: STAT_EVALUATION_TYPE.MEDIAN_REVIEWS_NUMBER },
  { labelPath: 'pages.statistics.types.reviewsReceived', value: STAT_EVALUATION_TYPE.REVIEWS_RECEIVED },
  { labelPath: 'pages.statistics.types.reviewsRequested', value: STAT_EVALUATION_TYPE.REVIEWS_REQUESTED },
]

export enum STAT_LABEL {
  GLANCE = 'glance',
  EVALUATION_PUBLICATION = 'evaluation-publication'
}

export interface IStatisticsPerLabel {
  labelPath: string;
  labelKey: STAT_LABEL;
  statistics: IStat[];
  isOpened: boolean;
} 