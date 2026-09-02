import { render } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import ThemeStyleSwitch from '../ThemeStyleSwitch';

let mockTheme = 'light';

vi.mock('@/hooks/store', () => ({
  useAppSelector: (selector: any) => selector({ themeReducer: { theme: mockTheme } }),
}));

describe('ThemeStyleSwitch', () => {
  afterEach(() => {
    document.body.classList.remove('dark-theme', 'light-theme');
    mockTheme = 'light';
  });

  it('renders nothing', () => {
    const { container } = render(<ThemeStyleSwitch />);
    expect(container).toBeEmptyDOMElement();
  });

  it('applies the light-theme class by default', () => {
    mockTheme = 'light';
    render(<ThemeStyleSwitch />);
    expect(document.body.classList.contains('light-theme')).toBe(true);
    expect(document.body.classList.contains('dark-theme')).toBe(false);
  });

  it('applies the dark-theme class when the theme is dark', () => {
    mockTheme = 'dark';
    render(<ThemeStyleSwitch />);
    expect(document.body.classList.contains('dark-theme')).toBe(true);
    expect(document.body.classList.contains('light-theme')).toBe(false);
  });
});
