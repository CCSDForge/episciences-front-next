import { BOARD_TYPE } from '@/services/board';
import { logger } from '@/lib/logger';

const log = logger.child({ service: 'boards-config' });

/**
 * Per-journal board display order, as a comma-separated list of board types, e.g.
 * NEXT_PUBLIC_JOURNAL_BOARDS_ORDER=editorial-board,technical-board,scientific-advisory-board
 *
 * Used by the boards page and the homepage members carousel. When empty or absent,
 * each screen keeps its own default order.
 */
export const BOARDS_ORDER_ENV_KEY = 'NEXT_PUBLIC_JOURNAL_BOARDS_ORDER';

// Evaluated lazily: services/board and utils/board-transforms import each other,
// so BOARD_TYPE may not be initialized yet when this module is evaluated.
const isBoardType = (value: string): value is BOARD_TYPE =>
  (Object.values(BOARD_TYPE) as string[]).includes(value);

/**
 * Parse a comma-separated board order. Unknown values are ignored (with a warning),
 * duplicates are removed. Returns null when no valid board type is configured.
 */
export function parseBoardsOrder(raw?: string | null): BOARD_TYPE[] | null {
  if (!raw) return null;

  const order: BOARD_TYPE[] = [];
  raw
    .split(',')
    .map(value => value.trim().toLowerCase())
    .filter(Boolean)
    .forEach(value => {
      if (!isBoardType(value)) {
        log.warn(`Unknown board type "${value}" in ${BOARDS_ORDER_ENV_KEY}, ignored`);
        return;
      }
      if (!order.includes(value)) order.push(value);
    });

  return order.length > 0 ? order : null;
}

/**
 * Read the configured board order for a journal (journal config first, then process env).
 */
export function getBoardsOrder(journalConfig?: Record<string, string>): BOARD_TYPE[] | null {
  return parseBoardsOrder(
    journalConfig?.[BOARDS_ORDER_ENV_KEY] ?? process.env[BOARDS_ORDER_ENV_KEY]
  );
}

/**
 * Merge a configured order with a default order: configured types come first,
 * remaining default types follow in their default order.
 */
export function resolveBoardOrder(
  custom: readonly BOARD_TYPE[] | null | undefined,
  defaults: readonly BOARD_TYPE[]
): BOARD_TYPE[] {
  if (!custom || custom.length === 0) return [...defaults];
  return [...custom, ...defaults.filter(type => !custom.includes(type))];
}
