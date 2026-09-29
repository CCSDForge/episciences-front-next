import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  BOARDS_ORDER_ENV_KEY,
  getBoardsOrder,
  parseBoardsOrder,
  resolveBoardOrder,
} from '../boards';
import { BOARD_TYPE, boardTypes } from '@/services/board';

describe('parseBoardsOrder', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null for undefined, null or empty values', () => {
    expect(parseBoardsOrder(undefined)).toBeNull();
    expect(parseBoardsOrder(null)).toBeNull();
    expect(parseBoardsOrder('')).toBeNull();
    expect(parseBoardsOrder(' , ,')).toBeNull();
  });

  it('parses a comma-separated list in order', () => {
    expect(parseBoardsOrder('editorial-board,technical-board,scientific-advisory-board')).toEqual([
      BOARD_TYPE.EDITORIAL_BOARD,
      BOARD_TYPE.TECHNICAL_BOARD,
      BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
    ]);
  });

  it('tolerates spaces and uppercase', () => {
    expect(parseBoardsOrder('  Editorial-Board ,  TECHNICAL-BOARD ')).toEqual([
      BOARD_TYPE.EDITORIAL_BOARD,
      BOARD_TYPE.TECHNICAL_BOARD,
    ]);
  });

  it('removes duplicates, keeping the first occurrence', () => {
    expect(parseBoardsOrder('technical-board,editorial-board,technical-board')).toEqual([
      BOARD_TYPE.TECHNICAL_BOARD,
      BOARD_TYPE.EDITORIAL_BOARD,
    ]);
  });

  it('ignores unknown values and warns about them', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseBoardsOrder('foo-board,editorial-board')).toEqual([BOARD_TYPE.EDITORIAL_BOARD]);
    expect(warn.mock.calls.flat().join(' ')).toContain('foo-board');
  });

  it('returns null when only unknown values are configured', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseBoardsOrder('foo,bar')).toBeNull();
  });
});

describe('getBoardsOrder', () => {
  afterEach(() => {
    delete process.env[BOARDS_ORDER_ENV_KEY];
  });

  it('returns null when nothing is configured', () => {
    expect(getBoardsOrder()).toBeNull();
    expect(getBoardsOrder({})).toBeNull();
  });

  it('reads the journal config', () => {
    expect(getBoardsOrder({ [BOARDS_ORDER_ENV_KEY]: 'editorial-board' })).toEqual([
      BOARD_TYPE.EDITORIAL_BOARD,
    ]);
  });

  it('falls back to process.env', () => {
    process.env[BOARDS_ORDER_ENV_KEY] = 'technical-board';
    expect(getBoardsOrder({})).toEqual([BOARD_TYPE.TECHNICAL_BOARD]);
  });

  it('gives priority to the journal config over process.env', () => {
    process.env[BOARDS_ORDER_ENV_KEY] = 'technical-board';
    expect(getBoardsOrder({ [BOARDS_ORDER_ENV_KEY]: 'editorial-board' })).toEqual([
      BOARD_TYPE.EDITORIAL_BOARD,
    ]);
  });
});

describe('resolveBoardOrder', () => {
  it('returns the default order when no custom order is given', () => {
    expect(resolveBoardOrder(null, boardTypes)).toEqual(boardTypes);
    expect(resolveBoardOrder(undefined, boardTypes)).toEqual(boardTypes);
    expect(resolveBoardOrder([], boardTypes)).toEqual(boardTypes);
  });

  it('puts configured types first and completes with the default order', () => {
    expect(
      resolveBoardOrder([BOARD_TYPE.EDITORIAL_BOARD, BOARD_TYPE.TECHNICAL_BOARD], boardTypes)
    ).toEqual([
      BOARD_TYPE.EDITORIAL_BOARD,
      BOARD_TYPE.TECHNICAL_BOARD,
      BOARD_TYPE.INTRODUCTION_BOARD,
      BOARD_TYPE.SCIENTIFIC_ADVISORY_BOARD,
      BOARD_TYPE.REVIEWERS_BOARD,
      BOARD_TYPE.FORMER_MEMBERS,
      BOARD_TYPE.OPERATING_CHARTER_BOARD,
    ]);
  });

  it('does not mutate the default order', () => {
    const defaults = [...boardTypes];
    resolveBoardOrder([BOARD_TYPE.TECHNICAL_BOARD], defaults);
    expect(defaults).toEqual(boardTypes);
  });
});
