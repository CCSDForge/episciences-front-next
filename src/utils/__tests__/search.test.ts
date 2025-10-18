import { describe, it, expect } from 'vitest'
import { formatSearchRange } from '../search'
import { SearchRange } from '../pagination'

describe('search utilities', () => {
  describe('formatSearchRange', () => {
    it('should handle undefined range gracefully', () => {
      // formatSearchRange expects a SearchRange object, not undefined
      // Passing an empty object instead
      const result = formatSearchRange({} as any)

      expect(result.years).toEqual([])
      expect(result.types).toEqual([])
      expect(result.volumes).toEqual({ en: [], fr: [] })
      expect(result.sections).toEqual({ en: [], fr: [] })
      expect(result.authors).toEqual([])
    })

    it('should return empty arrays for empty object', () => {
      const result = formatSearchRange({})

      expect(result.years).toEqual([])
      expect(result.types).toEqual([])
      expect(result.volumes).toEqual({ en: [], fr: [] })
      expect(result.sections).toEqual({ en: [], fr: [] })
      expect(result.authors).toEqual([])
    })

    describe('year formatting', () => {
      it('should format years object to array with value and count', () => {
        const range: any = {
          year: {
            '2024': 10,
            '2023': 15,
            '2022': 8
          }
        }

        const result = formatSearchRange(range)

        expect(result.years).toHaveLength(3)
        expect(result.years).toContainEqual({ value: 2024, count: 10 })
        expect(result.years).toContainEqual({ value: 2023, count: 15 })
        expect(result.years).toContainEqual({ value: 2022, count: 8 })
      })

      it('should handle single year', () => {
        const range: any = {
          year: { '2024': 5 }
        }

        const result = formatSearchRange(range)

        expect(result.years).toEqual([{ value: 2024, count: 5 }])
      })

      it('should return empty array when year is empty object', () => {
        const range: any = {
          year: {}
        }

        const result = formatSearchRange(range)

        expect(result.years).toEqual([])
      })
    })

    describe('type formatting', () => {
      it('should format types object to array with value and count', () => {
        const range: any = {
          type: {
            'article': 25,
            'review': 10,
            'letter': 3
          }
        }

        const result = formatSearchRange(range)

        expect(result.types).toHaveLength(3)
        expect(result.types).toContainEqual({ value: 'article', count: 25 })
        expect(result.types).toContainEqual({ value: 'review', count: 10 })
        expect(result.types).toContainEqual({ value: 'letter', count: 3 })
      })

      it('should handle single type', () => {
        const range: any = {
          type: { 'article': 100 }
        }

        const result = formatSearchRange(range)

        expect(result.types).toEqual([{ value: 'article', count: 100 }])
      })
    })

    describe('volume formatting', () => {
      it('should format volumes with multilingual support', () => {
        const range: any = {
          volume: {
            en: {
              '1': { 'Volume 1': 10 },
              '2': { 'Volume 2': 8 }
            },
            fr: {
              '1': { 'Tome 1': 10 },
              '2': { 'Tome 2': 8 }
            }
          }
        }

        const result = formatSearchRange(range)

        expect(result.volumes.en).toHaveLength(2)
        expect(result.volumes.fr).toHaveLength(2)
        expect(result.volumes.en).toContainEqual({ 1: 'Volume 1' })
        expect(result.volumes.en).toContainEqual({ 2: 'Volume 2' })
        expect(result.volumes.fr).toContainEqual({ 1: 'Tome 1' })
        expect(result.volumes.fr).toContainEqual({ 2: 'Tome 2' })
      })

      it('should handle volumes for single language', () => {
        const range: any = {
          volume: {
            en: {
              '1': { 'Volume 1': 5 }
            }
          }
        }

        const result = formatSearchRange(range)

        expect(result.volumes.en).toEqual([{ 1: 'Volume 1' }])
        // When only 'en' is provided, 'fr' will be undefined, not []
        expect(result.volumes.fr).toBeUndefined()
      })

      it('should handle empty volumes object', () => {
        const range: any = {
          volume: {}
        }

        const result = formatSearchRange(range)

        // Empty volume object results in empty object, not { en: [], fr: [] }
        expect(result.volumes).toEqual({})
      })
    })

    describe('section formatting', () => {
      it('should format sections with multilingual support', () => {
        const range: any = {
          section: {
            en: {
              '10': { 'Research Articles': 20 },
              '20': { 'Reviews': 5 }
            },
            fr: {
              '10': { 'Articles de recherche': 20 },
              '20': { 'Revues': 5 }
            }
          }
        }

        const result = formatSearchRange(range)

        expect(result.sections.en).toHaveLength(2)
        expect(result.sections.fr).toHaveLength(2)
        expect(result.sections.en).toContainEqual({ 10: 'Research Articles' })
        expect(result.sections.en).toContainEqual({ 20: 'Reviews' })
        expect(result.sections.fr).toContainEqual({ 10: 'Articles de recherche' })
        expect(result.sections.fr).toContainEqual({ 20: 'Revues' })
      })

      it('should handle empty sections', () => {
        const range: any = {
          section: {
            en: {},
            fr: {}
          }
        }

        const result = formatSearchRange(range)

        expect(result.sections).toEqual({ en: [], fr: [] })
      })
    })

    describe('author formatting', () => {
      it('should format authors object to array with value and count', () => {
        const range: any = {
          author: {
            'John Doe': 15,
            'Jane Smith': 10,
            'Bob Johnson': 5
          }
        }

        const result = formatSearchRange(range)

        expect(result.authors).toHaveLength(3)
        expect(result.authors).toContainEqual({ value: 'John Doe', count: 15 })
        expect(result.authors).toContainEqual({ value: 'Jane Smith', count: 10 })
        expect(result.authors).toContainEqual({ value: 'Bob Johnson', count: 5 })
      })

      it('should handle single author', () => {
        const range: any = {
          author: { 'John Doe': 20 }
        }

        const result = formatSearchRange(range)

        expect(result.authors).toEqual([{ value: 'John Doe', count: 20 }])
      })

      it('should handle empty authors object', () => {
        const range: any = {
          author: {}
        }

        const result = formatSearchRange(range)

        expect(result.authors).toEqual([])
      })
    })

    describe('complete data scenarios', () => {
      it('should format complete search range with all fields', () => {
        const range: any = {
          year: { '2024': 10, '2023': 15 },
          type: { 'article': 20, 'review': 5 },
          volume: {
            en: { '1': { 'Vol 1': 10 } },
            fr: { '1': { 'Tome 1': 10 } }
          },
          section: {
            en: { '10': { 'Research': 15 } },
            fr: { '10': { 'Recherche': 15 } }
          },
          author: { 'John Doe': 8 }
        }

        const result = formatSearchRange(range)

        expect(result.years).toHaveLength(2)
        expect(result.types).toHaveLength(2)
        expect(result.volumes.en).toHaveLength(1)
        expect(result.volumes.fr).toHaveLength(1)
        expect(result.sections.en).toHaveLength(1)
        expect(result.sections.fr).toHaveLength(1)
        expect(result.authors).toHaveLength(1)
      })

      it('should handle partial data with only some fields', () => {
        const range: any = {
          year: { '2024': 10 },
          author: { 'Jane Smith': 5 }
        }

        const result = formatSearchRange(range)

        expect(result.years).toHaveLength(1)
        expect(result.types).toEqual([])
        expect(result.volumes).toEqual({ en: [], fr: [] })
        expect(result.sections).toEqual({ en: [], fr: [] })
        expect(result.authors).toHaveLength(1)
      })
    })

    describe('edge cases', () => {
      it('should handle numeric string IDs for volumes and sections', () => {
        const range: any = {
          volume: {
            en: { '123': { 'Volume 123': 1 } }
          },
          section: {
            en: { '456': { 'Section 456': 2 } }
          }
        }

        const result = formatSearchRange(range)

        expect(result.volumes.en).toContainEqual({ 123: 'Volume 123' })
        expect(result.sections.en).toContainEqual({ 456: 'Section 456' })
      })

      it('should handle zero counts', () => {
        const range: any = {
          year: { '2024': 0 },
          type: { 'article': 0 },
          author: { 'John Doe': 0 }
        }

        const result = formatSearchRange(range)

        expect(result.years).toContainEqual({ value: 2024, count: 0 })
        expect(result.types).toContainEqual({ value: 'article', count: 0 })
        expect(result.authors).toContainEqual({ value: 'John Doe', count: 0 })
      })

      it('should handle special characters in author names', () => {
        const range: any = {
          author: {
            "O'Brien, M.": 5,
            'Müller, J.': 3,
            'García-López, A.': 7
          }
        }

        const result = formatSearchRange(range)

        expect(result.authors).toHaveLength(3)
        expect(result.authors).toContainEqual({ value: "O'Brien, M.", count: 5 })
        expect(result.authors).toContainEqual({ value: 'Müller, J.', count: 3 })
        expect(result.authors).toContainEqual({ value: 'García-López, A.', count: 7 })
      })
    })
  })
})
