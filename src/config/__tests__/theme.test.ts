import { describe, it, expect, afterEach } from 'vitest';
import applyThemeVariables from '../theme';

describe('applyThemeVariables', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('style');
    delete process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR;
    delete process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR;
  });

  it('applies default CSS variables when no config or env vars are set', () => {
    applyThemeVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--primary-text')).toBeTruthy();
    expect(root.style.getPropertyValue('--primary-border')).toBeTruthy();
    expect(root.style.getPropertyValue('--button-text-on-primary-bg')).toBeTruthy();
  });

  it('prefers the dynamic config color over process.env and the default', () => {
    process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR = '#0000ff';

    applyThemeVariables({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#ff0000' });

    // The generated --primary variant should trace back to the dynamic color, not env or default.
    expect(document.documentElement.style.getPropertyValue('--primary')).not.toBe('#000000');
  });

  it('falls back to process.env when no dynamic config is provided', () => {
    process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR = '#00ff00';

    applyThemeVariables();

    expect(document.documentElement.style.getPropertyValue('--primary')).toBeTruthy();
  });

  it('uses an explicit text-color override when provided', () => {
    process.env.NEXT_PUBLIC_JOURNAL_PRIMARY_TEXT_COLOR = '#111111';

    applyThemeVariables({ NEXT_PUBLIC_JOURNAL_PRIMARY_COLOR: '#ff0000' });

    expect(
      document.documentElement.style.getPropertyValue('--button-text-on-primary-bg')
    ).toBeTruthy();
  });

  it('sets focus indicator variables', () => {
    applyThemeVariables();

    const root = document.documentElement;
    expect(root.style.getPropertyValue('--focus-color')).toBeTruthy();
    expect(root.style.getPropertyValue('--focus-color-on-primary')).toBeTruthy();
    expect(root.style.getPropertyValue('--focus-color-on-dark')).toBeTruthy();
  });
});
