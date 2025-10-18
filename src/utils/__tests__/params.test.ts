import { describe, it, expect } from 'vitest'
import { getFormatParams } from '../params'

describe('params utilities', () => {
  describe('getFormatParams', () => {
    it('should convert string values directly', () => {
      const searchParams = {
        name: 'John',
        age: '30',
        city: 'Paris'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        name: 'John',
        age: '30',
        city: 'Paris'
      })
    })

    it('should extract first element from array values', () => {
      const searchParams = {
        tags: ['javascript', 'typescript', 'react'],
        categories: ['tech', 'science']
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        tags: 'javascript',
        categories: 'tech'
      })
    })

    it('should skip undefined values', () => {
      const searchParams = {
        name: 'John',
        age: undefined,
        city: 'Paris'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        name: 'John',
        city: 'Paris'
      })
      expect(result).not.toHaveProperty('age')
    })

    it('should skip empty array values', () => {
      const searchParams = {
        name: 'John',
        tags: [],
        city: 'Paris'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        name: 'John',
        city: 'Paris'
      })
      expect(result).not.toHaveProperty('tags')
    })

    it('should handle mixed parameter types', () => {
      const searchParams = {
        query: 'search term',
        filters: ['filter1', 'filter2'],
        page: '1',
        limit: undefined,
        sort: ['newest']
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        query: 'search term',
        filters: 'filter1',
        page: '1',
        sort: 'newest'
      })
    })

    it('should return empty object for empty input', () => {
      const searchParams = {}

      const result = getFormatParams(searchParams)

      expect(result).toEqual({})
    })

    it('should handle all undefined values', () => {
      const searchParams = {
        param1: undefined,
        param2: undefined,
        param3: undefined
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({})
    })

    it('should handle all empty arrays', () => {
      const searchParams = {
        param1: [],
        param2: [],
        param3: []
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({})
    })

    it('should handle single element arrays', () => {
      const searchParams = {
        singleTag: ['only-one']
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        singleTag: 'only-one'
      })
    })

    it('should handle special characters in string values', () => {
      const searchParams = {
        query: 'hello & goodbye',
        path: '/articles/123',
        email: 'test@example.com'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        query: 'hello & goodbye',
        path: '/articles/123',
        email: 'test@example.com'
      })
    })

    it('should handle numeric strings', () => {
      const searchParams = {
        page: '1',
        limit: '10',
        offset: '0'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        page: '1',
        limit: '10',
        offset: '0'
      })
    })

    it('should handle URL-encoded values', () => {
      const searchParams = {
        query: 'hello%20world',
        path: '%2Farticles%2F123'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        query: 'hello%20world',
        path: '%2Farticles%2F123'
      })
    })

    it('should preserve empty strings', () => {
      const searchParams = {
        query: '',
        name: 'John',
        description: ''
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        query: '',
        name: 'John',
        description: ''
      })
    })

    it('should handle complex mixed scenario', () => {
      const searchParams = {
        q: 'search',
        filter: ['type:article', 'year:2024'],
        page: '2',
        empty: [],
        undefined: undefined,
        single: ['value'],
        string: 'test'
      }

      const result = getFormatParams(searchParams)

      expect(result).toEqual({
        q: 'search',
        filter: 'type:article',
        page: '2',
        single: 'value',
        string: 'test'
      })
    })
  })
})
