import { describe, it, expect } from 'vitest';
import {
  STAT_TYPE,
  STAT_EVALUATION_TYPE,
  STAT_LABEL,
  statTypes,
  statEvaluationTypes,
} from '../stat';

// --- Tests ---

describe('stat constants', () => {
  describe('STAT_TYPE enum', () => {
    it('has the correct string values', () => {
      expect(STAT_TYPE.NB_SUBMISSIONS).toBe('nb-submissions');
      expect(STAT_TYPE.ACCEPTANCE_RATE).toBe('acceptance-rate');
      expect(STAT_TYPE.MEDIAN_SUBMISSION_PUBLICATION).toBe('median-submission-publication');
      expect(STAT_TYPE.MEDIAN_SUBMISSION_ACCEPTANCE).toBe('median-submission-acceptance');
      expect(STAT_TYPE.NB_SUBMISSIONS_DETAILS).toBe('nb-submissions-details');
      expect(STAT_TYPE.EVALUATION).toBe('evaluation');
    });

    it('has exactly 6 entries', () => {
      const entries = Object.values(STAT_TYPE);
      expect(entries).toHaveLength(6);
    });
  });

  describe('statTypes array', () => {
    it('contains one entry per STAT_TYPE value', () => {
      expect(statTypes).toHaveLength(6);
    });

    it('every entry has a non-empty labelPath and value', () => {
      for (const entry of statTypes) {
        expect(entry.labelPath).toBeTruthy();
        expect(entry.value).toBeTruthy();
      }
    });

    it('every value matches a STAT_TYPE enum value', () => {
      const validValues = Object.values(STAT_TYPE) as string[];
      for (const entry of statTypes) {
        expect(validValues).toContain(entry.value);
      }
    });

    it('all labelPaths start with pages.statistics.types.', () => {
      for (const entry of statTypes) {
        expect(entry.labelPath).toMatch(/^pages\.statistics\.types\./);
      }
    });

    it('has no duplicate values', () => {
      const values = statTypes.map(e => e.value);
      expect(new Set(values).size).toBe(values.length);
    });

    it('has no duplicate labelPaths', () => {
      const paths = statTypes.map(e => e.labelPath);
      expect(new Set(paths).size).toBe(paths.length);
    });

    it('contains an entry for NB_SUBMISSIONS', () => {
      expect(statTypes.find(e => e.value === STAT_TYPE.NB_SUBMISSIONS)).toBeDefined();
    });

    it('contains an entry for EVALUATION', () => {
      expect(statTypes.find(e => e.value === STAT_TYPE.EVALUATION)).toBeDefined();
    });
  });

  describe('STAT_EVALUATION_TYPE enum', () => {
    it('has the correct string values', () => {
      expect(STAT_EVALUATION_TYPE.MEDIAN_REVIEWS_NUMBER).toBe('medianReviewsNumber');
      expect(STAT_EVALUATION_TYPE.REVIEWS_RECEIVED).toBe('reviewsReceived');
      expect(STAT_EVALUATION_TYPE.REVIEWS_REQUESTED).toBe('reviewsRequested');
    });

    it('has exactly 3 entries', () => {
      const entries = Object.values(STAT_EVALUATION_TYPE);
      expect(entries).toHaveLength(3);
    });
  });

  describe('statEvaluationTypes array', () => {
    it('contains one entry per STAT_EVALUATION_TYPE value', () => {
      expect(statEvaluationTypes).toHaveLength(3);
    });

    it('every entry has a non-empty labelPath and value', () => {
      for (const entry of statEvaluationTypes) {
        expect(entry.labelPath).toBeTruthy();
        expect(entry.value).toBeTruthy();
      }
    });

    it('every value matches a STAT_EVALUATION_TYPE enum value', () => {
      const validValues = Object.values(STAT_EVALUATION_TYPE) as string[];
      for (const entry of statEvaluationTypes) {
        expect(validValues).toContain(entry.value);
      }
    });

    it('all labelPaths start with pages.statistics.types.', () => {
      for (const entry of statEvaluationTypes) {
        expect(entry.labelPath).toMatch(/^pages\.statistics\.types\./);
      }
    });

    it('has no duplicate values', () => {
      const values = statEvaluationTypes.map(e => e.value);
      expect(new Set(values).size).toBe(values.length);
    });
  });

  describe('STAT_LABEL enum', () => {
    it('has the correct string values', () => {
      expect(STAT_LABEL.GLANCE).toBe('glance');
      expect(STAT_LABEL.EVALUATION_PUBLICATION).toBe('evaluation-publication');
    });

    it('has exactly 2 entries', () => {
      const entries = Object.values(STAT_LABEL);
      expect(entries).toHaveLength(2);
    });
  });
});
