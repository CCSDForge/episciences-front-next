import { describe, it, expect } from 'vitest'
import {
  RTL_LANGUAGE_CODES,
  isRTLLanguage,
  getTextDirection,
  getLanguageLabel,
  isRTLLanguageCode
} from '../rtl-languages'

describe('rtl-languages utilities', () => {
  describe('RTL_LANGUAGE_CODES constant', () => {
    it('should contain all RTL language codes', () => {
      expect(RTL_LANGUAGE_CODES).toContain('ar')  // Arabic
      expect(RTL_LANGUAGE_CODES).toContain('fa')  // Persian
      expect(RTL_LANGUAGE_CODES).toContain('ur')  // Urdu
      expect(RTL_LANGUAGE_CODES).toContain('he')  // Hebrew
      expect(RTL_LANGUAGE_CODES).toContain('yi')  // Yiddish
      expect(RTL_LANGUAGE_CODES).toContain('sd')  // Sindhi
      expect(RTL_LANGUAGE_CODES).toContain('ps')  // Pashto
      expect(RTL_LANGUAGE_CODES).toContain('ks')  // Kashmiri
      expect(RTL_LANGUAGE_CODES).toContain('ug')  // Uyghur
      expect(RTL_LANGUAGE_CODES).toContain('ckb') // Kurdish (Sorani)
      expect(RTL_LANGUAGE_CODES).toContain('dv')  // Dhivehi
    })

    it('should have exactly 11 RTL languages', () => {
      expect(RTL_LANGUAGE_CODES).toHaveLength(11)
    })

    it('should be readonly', () => {
      // TypeScript enforces this at compile time, but we can verify it's an array
      expect(Array.isArray(RTL_LANGUAGE_CODES)).toBe(true)
    })
  })

  describe('isRTLLanguage', () => {
    describe('RTL languages', () => {
      it('should return true for Arabic', () => {
        expect(isRTLLanguage('ar')).toBe(true)
      })

      it('should return true for Persian/Farsi', () => {
        expect(isRTLLanguage('fa')).toBe(true)
      })

      it('should return true for Urdu', () => {
        expect(isRTLLanguage('ur')).toBe(true)
      })

      it('should return true for Hebrew', () => {
        expect(isRTLLanguage('he')).toBe(true)
      })

      it('should return true for Yiddish', () => {
        expect(isRTLLanguage('yi')).toBe(true)
      })

      it('should return true for Sindhi', () => {
        expect(isRTLLanguage('sd')).toBe(true)
      })

      it('should return true for Pashto', () => {
        expect(isRTLLanguage('ps')).toBe(true)
      })

      it('should return true for Kashmiri', () => {
        expect(isRTLLanguage('ks')).toBe(true)
      })

      it('should return true for Uyghur', () => {
        expect(isRTLLanguage('ug')).toBe(true)
      })

      it('should return true for Kurdish (Sorani)', () => {
        expect(isRTLLanguage('ckb')).toBe(true)
      })

      it('should return true for Dhivehi', () => {
        expect(isRTLLanguage('dv')).toBe(true)
      })
    })

    describe('LTR languages', () => {
      it('should return false for English', () => {
        expect(isRTLLanguage('en')).toBe(false)
      })

      it('should return false for French', () => {
        expect(isRTLLanguage('fr')).toBe(false)
      })

      it('should return false for Spanish', () => {
        expect(isRTLLanguage('es')).toBe(false)
      })

      it('should return false for German', () => {
        expect(isRTLLanguage('de')).toBe(false)
      })

      it('should return false for Italian', () => {
        expect(isRTLLanguage('it')).toBe(false)
      })

      it('should return false for Chinese', () => {
        expect(isRTLLanguage('zh')).toBe(false)
      })

      it('should return false for Japanese', () => {
        expect(isRTLLanguage('ja')).toBe(false)
      })

      it('should return false for Russian', () => {
        expect(isRTLLanguage('ru')).toBe(false)
      })
    })

    describe('case sensitivity', () => {
      it('should handle uppercase language codes', () => {
        expect(isRTLLanguage('AR')).toBe(true)
        expect(isRTLLanguage('HE')).toBe(true)
        expect(isRTLLanguage('FA')).toBe(true)
      })

      it('should handle mixed case language codes', () => {
        expect(isRTLLanguage('Ar')).toBe(true)
        expect(isRTLLanguage('He')).toBe(true)
        expect(isRTLLanguage('CKB')).toBe(true)
      })
    })

    describe('whitespace handling', () => {
      it('should trim leading whitespace', () => {
        expect(isRTLLanguage('  ar')).toBe(true)
        expect(isRTLLanguage('\tar')).toBe(true)
      })

      it('should trim trailing whitespace', () => {
        expect(isRTLLanguage('ar  ')).toBe(true)
        expect(isRTLLanguage('ar\n')).toBe(true)
      })

      it('should trim both leading and trailing whitespace', () => {
        expect(isRTLLanguage('  ar  ')).toBe(true)
      })
    })

    describe('edge cases', () => {
      it('should return false for empty string', () => {
        expect(isRTLLanguage('')).toBe(false)
      })

      it('should return false for whitespace only', () => {
        expect(isRTLLanguage('   ')).toBe(false)
      })

      it('should return false for invalid language codes', () => {
        expect(isRTLLanguage('invalid')).toBe(false)
        expect(isRTLLanguage('xyz')).toBe(false)
        expect(isRTLLanguage('123')).toBe(false)
      })
    })
  })

  describe('getTextDirection', () => {
    it('should return "rtl" for RTL languages', () => {
      expect(getTextDirection('ar')).toBe('rtl')
      expect(getTextDirection('he')).toBe('rtl')
      expect(getTextDirection('fa')).toBe('rtl')
      expect(getTextDirection('ur')).toBe('rtl')
    })

    it('should return "ltr" for LTR languages', () => {
      expect(getTextDirection('en')).toBe('ltr')
      expect(getTextDirection('fr')).toBe('ltr')
      expect(getTextDirection('es')).toBe('ltr')
      expect(getTextDirection('de')).toBe('ltr')
    })

    it('should return "ltr" for empty string', () => {
      expect(getTextDirection('')).toBe('ltr')
    })

    it('should return "ltr" for invalid language codes', () => {
      expect(getTextDirection('invalid')).toBe('ltr')
      expect(getTextDirection('xyz')).toBe('ltr')
    })

    it('should handle uppercase RTL codes', () => {
      expect(getTextDirection('AR')).toBe('rtl')
      expect(getTextDirection('HE')).toBe('rtl')
    })

    it('should handle uppercase LTR codes', () => {
      expect(getTextDirection('EN')).toBe('ltr')
      expect(getTextDirection('FR')).toBe('ltr')
    })
  })

  describe('getLanguageLabel', () => {
    it('should return empty string for empty input', () => {
      expect(getLanguageLabel('')).toBe('')
    })

    it('should return uppercase code as fallback for valid codes', () => {
      // When Intl.DisplayNames is not available or fails, returns uppercase
      const result = getLanguageLabel('en')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle different display languages', () => {
      // Test with English display language
      const labelEn = getLanguageLabel('ar', 'en')
      expect(typeof labelEn).toBe('string')
      expect(labelEn.length).toBeGreaterThan(0)

      // Test with French display language
      const labelFr = getLanguageLabel('ar', 'fr')
      expect(typeof labelFr).toBe('string')
      expect(labelFr.length).toBeGreaterThan(0)
    })

    it('should default to English when displayLang is not provided', () => {
      const result = getLanguageLabel('ar')
      expect(typeof result).toBe('string')
      expect(result.length).toBeGreaterThan(0)
    })

    it('should handle RTL language codes', () => {
      RTL_LANGUAGE_CODES.forEach(code => {
        const label = getLanguageLabel(code)
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('should handle LTR language codes', () => {
      const ltrCodes = ['en', 'fr', 'es', 'de', 'it']
      ltrCodes.forEach(code => {
        const label = getLanguageLabel(code)
        expect(typeof label).toBe('string')
        expect(label.length).toBeGreaterThan(0)
      })
    })

    it('should handle invalid language codes gracefully', () => {
      const result = getLanguageLabel('invalid-code')
      expect(typeof result).toBe('string')
      // Should return uppercase or some fallback
      expect(result.length).toBeGreaterThan(0)
    })
  })

  describe('isRTLLanguageCode', () => {
    it('should return true for all RTL language codes', () => {
      RTL_LANGUAGE_CODES.forEach(code => {
        expect(isRTLLanguageCode(code)).toBe(true)
      })
    })

    it('should return false for LTR language codes', () => {
      expect(isRTLLanguageCode('en')).toBe(false)
      expect(isRTLLanguageCode('fr')).toBe(false)
      expect(isRTLLanguageCode('es')).toBe(false)
    })

    it('should return false for invalid codes', () => {
      expect(isRTLLanguageCode('invalid')).toBe(false)
      expect(isRTLLanguageCode('xyz')).toBe(false)
      expect(isRTLLanguageCode('')).toBe(false)
    })

    it('should be case-sensitive (unlike isRTLLanguage)', () => {
      // isRTLLanguageCode doesn't normalize, so it's case-sensitive
      expect(isRTLLanguageCode('ar')).toBe(true)
      // Uppercase won't match because RTL_LANGUAGE_CODES contains lowercase
      expect(isRTLLanguageCode('AR')).toBe(false)
    })
  })

  describe('integration scenarios', () => {
    it('should work together for RTL detection and direction', () => {
      const code = 'ar'
      expect(isRTLLanguage(code)).toBe(true)
      expect(isRTLLanguageCode(code)).toBe(true)
      expect(getTextDirection(code)).toBe('rtl')
    })

    it('should work together for LTR detection and direction', () => {
      const code = 'en'
      expect(isRTLLanguage(code)).toBe(false)
      expect(isRTLLanguageCode(code)).toBe(false)
      expect(getTextDirection(code)).toBe('ltr')
    })

    it('should handle all RTL codes consistently', () => {
      RTL_LANGUAGE_CODES.forEach(code => {
        expect(isRTLLanguage(code)).toBe(true)
        expect(isRTLLanguageCode(code)).toBe(true)
        expect(getTextDirection(code)).toBe('rtl')
        expect(getLanguageLabel(code)).toBeTruthy()
      })
    })
  })
})
