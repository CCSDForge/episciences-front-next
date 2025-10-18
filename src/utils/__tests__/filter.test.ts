import { describe, it, expect } from 'vitest'
import { alphabet } from '../filter'

describe('filter utilities', () => {
  describe('alphabet', () => {
    it('should contain 26 letters', () => {
      expect(alphabet).toHaveLength(26)
    })

    it('should start with A', () => {
      expect(alphabet[0]).toBe('A')
    })

    it('should end with Z', () => {
      expect(alphabet[25]).toBe('Z')
    })

    it('should contain all uppercase letters', () => {
      const expected = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z']
      expect(alphabet).toEqual(expected)
    })

    it('should be in alphabetical order', () => {
      const sortedAlphabet = [...alphabet].sort()
      expect(alphabet).toEqual(sortedAlphabet)
    })

    it('should contain only strings', () => {
      alphabet.forEach(letter => {
        expect(typeof letter).toBe('string')
      })
    })

    it('should contain only single characters', () => {
      alphabet.forEach(letter => {
        expect(letter).toHaveLength(1)
      })
    })

    it('should not contain duplicates', () => {
      const uniqueLetters = [...new Set(alphabet)]
      expect(uniqueLetters).toHaveLength(alphabet.length)
    })

    it('should be an array', () => {
      expect(Array.isArray(alphabet)).toBe(true)
    })

    it('should contain specific letters', () => {
      expect(alphabet).toContain('A')
      expect(alphabet).toContain('M')
      expect(alphabet).toContain('Z')
    })

    it('should have correct letter at specific indices', () => {
      expect(alphabet[0]).toBe('A')  // Index 0 = A
      expect(alphabet[12]).toBe('M') // Index 12 = M
      expect(alphabet[25]).toBe('Z') // Index 25 = Z
    })
  })
})
