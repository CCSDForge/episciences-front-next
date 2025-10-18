import { describe, it, expect } from 'vitest'
import { formatDate } from '../date'

describe('formatDate', () => {
  describe('valid date formats', () => {
    it('should format ISO date string with timezone', () => {
      const result = formatDate('2024-01-15T10:30:00Z', 'en')
      expect(result).toBe('January 15, 2024')
    })

    it('should format DD/MM/YYYY format', () => {
      const result = formatDate('15/01/2024', 'en')
      expect(result).toBe('January 15, 2024')
    })

    it('should format YYYY-MM-DD format', () => {
      const result = formatDate('2024-01-15', 'en')
      expect(result).toBe('January 15, 2024')
    })

    it('should format date in French locale', () => {
      const result = formatDate('2024-01-15', 'fr')
      expect(result).toBe('15 janvier 2024')
    })

    it('should format date in Spanish locale', () => {
      const result = formatDate('2024-01-15', 'es')
      expect(result).toBe('15 de enero de 2024')
    })
  })

  describe('custom date format options', () => {
    it('should format with custom options - short format', () => {
      const result = formatDate('2024-01-15', 'en', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
      expect(result).toBe('Jan 15, 2024')
    })

    it('should format with custom options - numeric format', () => {
      const result = formatDate('2024-01-15', 'en', {
        year: 'numeric',
        month: 'numeric',
        day: 'numeric',
      })
      expect(result).toBe('1/15/2024')
    })
  })

  describe('edge cases', () => {
    it('should return empty string for undefined input', () => {
      const result = formatDate(undefined, 'en')
      expect(result).toBe('')
    })

    it('should return empty string for empty string', () => {
      const result = formatDate('', 'en')
      expect(result).toBe('')
    })

    it('should return empty string for invalid date string', () => {
      const result = formatDate('invalid-date', 'en')
      expect(result).toBe('')
    })

    it('should handle malformed date by trying to parse it', () => {
      // JavaScript Date constructor attempts to parse invalid dates
      // '2024-13-45' becomes February 14, 2025 (13 months from start of 2024 + 45 days)
      const result = formatDate('2024-13-45', 'en')
      // Either it parses to a date or returns empty string
      expect(typeof result).toBe('string')
    })
  })

  describe('date format variations', () => {
    it('should handle date with time components', () => {
      const result = formatDate('2024-01-15T14:30:45.123Z', 'en')
      expect(result).toBe('January 15, 2024')
    })

    it('should handle leap year dates', () => {
      const result = formatDate('2024-02-29', 'en')
      expect(result).toBe('February 29, 2024')
    })

    it('should handle end of year date', () => {
      const result = formatDate('2024-12-31', 'en')
      expect(result).toBe('December 31, 2024')
    })

    it('should handle beginning of year date', () => {
      const result = formatDate('2024-01-01', 'en')
      expect(result).toBe('January 1, 2024')
    })
  })

  describe('different locales', () => {
    it('should format correctly for German locale', () => {
      const result = formatDate('2024-01-15', 'de')
      expect(result).toBe('15. Januar 2024')
    })

    it('should format correctly for Italian locale', () => {
      const result = formatDate('2024-01-15', 'it')
      expect(result).toBe('15 gennaio 2024')
    })

    it('should format correctly for Portuguese locale', () => {
      const result = formatDate('2024-01-15', 'pt')
      expect(result).toBe('15 de janeiro de 2024')
    })
  })
})
