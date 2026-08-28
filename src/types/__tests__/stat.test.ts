import { describe, it, expect } from 'vitest';
import { isIStatValueDetails, isIStatValueEvaluation, getFormattedStatsAsPieChart } from '../stat';

describe('isIStatValueDetails', () => {
  it('returns true when published is defined', () => {
    expect(isIStatValueDetails({ published: 5 })).toBe(true);
  });

  it('returns true when refused is defined', () => {
    expect(isIStatValueDetails({ refused: 2 })).toBe(true);
  });

  it('returns true when being-to-publish is defined', () => {
    expect(isIStatValueDetails({ 'being-to-publish': {} })).toBe(true);
  });

  it('returns false for a plain number', () => {
    expect(isIStatValueDetails(42)).toBe(false);
  });

  it('returns false for an empty details object', () => {
    expect(isIStatValueDetails({})).toBe(false);
  });
});

describe('isIStatValueEvaluation', () => {
  it('returns true when median-reviews-number is defined', () => {
    expect(isIStatValueEvaluation({ 'median-reviews-number': 3 } as never)).toBe(true);
  });

  it('returns true when reviews-received is defined', () => {
    expect(isIStatValueEvaluation({ 'reviews-received': 3 } as never)).toBe(true);
  });

  it('returns true when reviews-requested is defined', () => {
    expect(isIStatValueEvaluation({ 'reviews-requested': 3 } as never)).toBe(true);
  });

  it('returns false for a plain number', () => {
    expect(isIStatValueEvaluation(42)).toBe(false);
  });

  it('returns false for an empty evaluation object', () => {
    expect(isIStatValueEvaluation({})).toBe(false);
  });
});

describe('getFormattedStatsAsPieChart', () => {
  it('returns an empty array for a non-details value', () => {
    expect(getFormattedStatsAsPieChart(42)).toEqual([]);
  });

  it('formats published and refused counts', () => {
    const result = getFormattedStatsAsPieChart({ published: 10, refused: 3 });
    expect(result).toEqual([
      { status: 'published', count: 10 },
      { status: 'refused', count: 3 },
    ]);
  });

  it('formats being-to-publish accepted and other-status counts', () => {
    const result = getFormattedStatsAsPieChart({
      'being-to-publish': { accepted: 4, 'other-status': 2 },
    });
    expect(result).toEqual([
      { status: 'accepted', count: 4, isBeingToPublishStatus: true },
      { status: 'other-status', count: 2, isBeingToPublishStatus: true },
    ]);
  });

  it('returns an empty array when the details object has no recognized fields', () => {
    // isIStatValueDetails requires at least one of published/refused/being-to-publish;
    // exercise the branch where being-to-publish exists but its sub-fields don't.
    const result = getFormattedStatsAsPieChart({ 'being-to-publish': {} });
    expect(result).toEqual([]);
  });

  it('formats only the being-to-publish accepted count', () => {
    const result = getFormattedStatsAsPieChart({ 'being-to-publish': { accepted: 7 } });
    expect(result).toEqual([{ status: 'accepted', count: 7, isBeingToPublishStatus: true }]);
  });

  it('formats only the being-to-publish other-status count', () => {
    const result = getFormattedStatsAsPieChart({ 'being-to-publish': { 'other-status': 9 } });
    expect(result).toEqual([{ status: 'other-status', count: 9, isBeingToPublishStatus: true }]);
  });

  it('formats all fields together', () => {
    const result = getFormattedStatsAsPieChart({
      published: 1,
      refused: 2,
      'being-to-publish': { accepted: 3, 'other-status': 4 },
    });
    expect(result).toEqual([
      { status: 'published', count: 1 },
      { status: 'refused', count: 2 },
      { status: 'accepted', count: 3, isBeingToPublishStatus: true },
      { status: 'other-status', count: 4, isBeingToPublishStatus: true },
    ]);
  });
});
