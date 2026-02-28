import { describe, it, expect } from 'vitest';
import { DEFAULT_ITEMS_PER_PAGE } from '../pagination';

describe('pagination', () => {
  describe('DEFAULT_ITEMS_PER_PAGE', () => {
    it('should equal 30', () => {
      expect(DEFAULT_ITEMS_PER_PAGE).toBe(30);
    });

    it('should be a positive integer', () => {
      expect(DEFAULT_ITEMS_PER_PAGE).toBeGreaterThan(0);
      expect(Number.isInteger(DEFAULT_ITEMS_PER_PAGE)).toBe(true);
    });
  });

  describe('page calculation helpers (derived from constant)', () => {
    it('should calculate total pages correctly for exact multiple', () => {
      const totalItems = 90;
      const totalPages = Math.ceil(totalItems / DEFAULT_ITEMS_PER_PAGE);
      expect(totalPages).toBe(3);
    });

    it('should calculate total pages correctly when items are not exact multiple', () => {
      const totalItems = 91;
      const totalPages = Math.ceil(totalItems / DEFAULT_ITEMS_PER_PAGE);
      expect(totalPages).toBe(4);
    });

    it('should calculate correct offset for page 1', () => {
      const page = 1;
      const offset = (page - 1) * DEFAULT_ITEMS_PER_PAGE;
      expect(offset).toBe(0);
    });

    it('should calculate correct offset for page 2', () => {
      const page = 2;
      const offset = (page - 1) * DEFAULT_ITEMS_PER_PAGE;
      expect(offset).toBe(30);
    });

    it('should calculate correct offset for page 3', () => {
      const page = 3;
      const offset = (page - 1) * DEFAULT_ITEMS_PER_PAGE;
      expect(offset).toBe(60);
    });

    it('should return 1 page for empty results', () => {
      const totalItems = 0;
      const totalPages = Math.max(1, Math.ceil(totalItems / DEFAULT_ITEMS_PER_PAGE));
      expect(totalPages).toBe(1);
    });

    it('should return 1 page when items fit in single page', () => {
      const totalItems = DEFAULT_ITEMS_PER_PAGE;
      const totalPages = Math.ceil(totalItems / DEFAULT_ITEMS_PER_PAGE);
      expect(totalPages).toBe(1);
    });
  });
});
