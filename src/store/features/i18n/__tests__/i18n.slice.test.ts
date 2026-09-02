import { describe, it, expect } from 'vitest';
import reducer, { setLanguage } from '../i18n.slice';
import { defaultLanguage } from '@/utils/i18n';

describe('i18n.slice', () => {
  it('returns the initial state with the default language', () => {
    expect(reducer(undefined, { type: '@@INIT' })).toEqual({ language: defaultLanguage });
  });

  it('setLanguage updates the current language', () => {
    const state = reducer({ language: defaultLanguage }, setLanguage('en'));
    expect(state.language).toBe('en');
  });
});
